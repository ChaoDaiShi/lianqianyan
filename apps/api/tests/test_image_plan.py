import asyncio
import json

from httpx import MockTransport, Response

from app.llm import BaseLLMProvider, LLMMessage, LLMResult
from app.resources import ImagePlan, MiniMaxImageService, TextCheck, plan_image, verify_text


class ScriptedLLM(BaseLLMProvider):
    def __init__(self, content: str | Exception) -> None:
        self._content = content

    @property
    def name(self) -> str:
        return "scripted"

    async def chat(self, messages: list[LLMMessage], **kwargs) -> LLMResult:
        if isinstance(self._content, Exception):
            raise self._content
        return LLMResult(content=self._content, usage={})


def test_plan_image_parses_plain_json_and_maps_metaphors() -> None:
    provider = ScriptedLLM(json.dumps({
        "should_generate": True,
        "reason": "概念抽象，图示有帮助",
        "central_metaphor": "锁与循环箭头",
        "card_metaphors": ["放大镜", "链条", "盾牌", "天平"],
    }))
    plan = asyncio.run(plan_image(provider, "死锁", ["定义与判断", "四个必要条件", "死锁预防", "检测与解除"]))
    assert plan is not None and plan.planned_by == "llm"
    assert plan.should_generate is True
    assert plan.central_metaphor == "锁与循环箭头"
    assert plan.card_metaphors == ["放大镜", "链条", "盾牌", "天平"]


def test_plan_image_tolerates_markdown_fence_and_rejects_garbage() -> None:
    fenced = ScriptedLLM("好的，方案如下：\n```json\n{\"should_generate\": false, \"reason\": \"内容偏程序性步骤\"}\n```\n以上。")
    plan = asyncio.run(plan_image(fenced, "进程调度", ["典型算法"]))
    assert plan is not None and plan.should_generate is False
    assert "程序性" in plan.reason

    assert asyncio.run(plan_image(ScriptedLLM("我觉得配个图不错"), "死锁", ["定义"])) is None
    assert asyncio.run(plan_image(ScriptedLLM(RuntimeError("llm down")), "死锁", ["定义"])) is None


def test_verify_text_maps_pass_and_issues() -> None:
    ok = asyncio.run(verify_text(ScriptedLLM('{"passed": true, "summary": "结构完整", "issues": []}'), "# 死锁\n\n正文"))
    assert ok == TextCheck(passed=True, summary="结构完整", issues=[])

    bad = asyncio.run(verify_text(ScriptedLLM('{"passed": false, "summary": "存在乱码", "issues": ["第二句被截断"]}'), "# 死锁\n\n正文"))
    assert bad is not None and bad.passed is False and bad.issues == ["第二句被截断"]


def test_image_generation_skips_without_calling_minimax_when_plan_declines() -> None:
    called = {"count": 0}

    def handler(request) -> Response:
        called["count"] += 1
        return Response(200, json={"data": {"image_urls": ["https://cdn.example.edu/x.png"]}})

    from app.core.config import Settings

    service = MiniMaxImageService(Settings(minimax_api_key="k"), transport=MockTransport(handler))
    result = asyncio.run(service.generate(_request_with_plan({"should_generate": False, "reason": "步骤类内容", "planned_by": "llm"})))
    assert result.skipped is True and result.image_urls == [] and "步骤" in result.skip_reason
    assert called["count"] == 0

    ok = asyncio.run(service.generate(_request_with_plan({
        "should_generate": True, "central_metaphor": "锁与循环箭头",
        "card_metaphors": ["放大镜", "盾牌"], "planned_by": "llm",
    })))
    assert ok.skipped is False and ok.image_urls == ["https://cdn.example.edu/x.png"]
    assert "锁与循环箭头" in ok.prompt and "放大镜" in ok.prompt


def _request_with_plan(plan: dict):
    from app.resources import ResourceImageRequest
    from app.resources.models import ImagePlanPayload

    return ResourceImageRequest(
        course_id="course-os", knowledge_point_id="kp-deadlock", aspect_ratio="16:9",
        plan=ImagePlanPayload(**plan),
    )
