from __future__ import annotations

from app.lab import CompileSimulationRequest, TeachingCompilerSimulator

VALID_PROGRAM = r'''#include <stdio.h>
int main(void) {
  int x = 2;
  int y = 3;
  printf("%d\n", x + y);
  return 0;
}'''


def simulate(code: str):
    return TeachingCompilerSimulator().simulate(
        CompileSimulationRequest(language="c-edu", code=code)
    )


def diagnostic_codes(result) -> list[str]:
    return [item.code for item in result.diagnostics]


def test_valid_program_passes_five_stages_and_prints_integer_output() -> None:
    result = simulate(VALID_PROGRAM)

    assert result.success is True
    assert result.mode == "simulation"
    assert result.stdout == "5\n"
    assert [stage.name for stage in result.stages] == [
        "preprocess",
        "syntax",
        "semantic",
        "link",
        "run",
    ]
    assert [stage.status for stage in result.stages] == ["passed"] * 5
    assert result.diagnostics == []
    assert "不执行本机程序" in result.safety_notice


def test_literal_output_assignments_parentheses_and_c_integer_division() -> None:
    result = simulate(
        r'''int main() {
  int total = (8 + 4) * 2;
  total = total / 5;
  printf("结果：");
  printf("%d", total);
  return 0;
}'''
    )

    assert result.success is True
    assert result.stdout == "结果：4"


def test_missing_main_and_unsupported_statement_fail_syntax_deterministically() -> None:
    missing = simulate('printf("hello");')
    assert missing.success is False
    assert diagnostic_codes(missing) == ["C1001"]
    assert [stage.status for stage in missing.stages] == [
        "passed",
        "failed",
        "skipped",
        "skipped",
        "skipped",
    ]

    unsupported = simulate(
        """int main() {
  while (1) {
  }
  return 0;
}"""
    )
    assert unsupported.success is False
    assert diagnostic_codes(unsupported) == ["C1002"]
    assert unsupported.diagnostics[0].line == 2


def test_semantic_phase_rejects_undeclared_and_duplicate_variables() -> None:
    undeclared = simulate(
        """int main() {
  value = 3;
  return 0;
}"""
    )
    assert diagnostic_codes(undeclared) == ["C2001"]
    assert undeclared.stages[2].status == "failed"
    assert undeclared.stages[3].status == "skipped"

    duplicate = simulate(
        """int main() {
  int value = 1;
  int value = 2;
  return 0;
}"""
    )
    assert diagnostic_codes(duplicate) == ["C2002"]
    assert duplicate.diagnostics[0].line == 3


def test_expression_whitelist_rejects_calls_and_unknown_names() -> None:
    call = simulate(
        """int main() {
  int value = system(1);
  return 0;
}"""
    )
    assert diagnostic_codes(call) == ["C1004"]

    unknown = simulate(
        """int main() {
  int value = missing + 1;
  return 0;
}"""
    )
    assert diagnostic_codes(unknown) == ["C2001"]


def test_run_phase_reports_division_by_zero_without_python_details() -> None:
    result = simulate(
        """int main() {
  int zero = 0;
  printf("%d", 8 / zero);
  return 0;
}"""
    )

    assert result.success is False
    assert diagnostic_codes(result) == ["C3001"]
    assert result.stages[-1].status == "failed"
    assert result.stdout == ""
    assert "ZeroDivisionError" not in result.diagnostics[0].message


def test_preprocess_rejects_headers_and_source_over_eighty_lines() -> None:
    header = simulate(
        """#include <stdlib.h>
int main() {
  return 0;
}"""
    )
    assert diagnostic_codes(header) == ["C0101"]
    assert header.stages[0].status == "failed"

    too_many_lines = simulate("\n".join(["// line"] * 81))
    assert diagnostic_codes(too_many_lines) == ["C0001"]
    assert [stage.status for stage in too_many_lines.stages] == [
        "failed",
        "skipped",
        "skipped",
        "skipped",
        "skipped",
    ]


def test_output_is_capped_with_a_structured_warning() -> None:
    literal = "甲" * 2_100
    result = simulate(
        f'''int main() {{
  printf("{literal}");
  return 0;
}}'''
    )

    assert result.success is True
    assert len(result.stdout) == 2_000
    assert diagnostic_codes(result) == ["C3002"]
    assert result.diagnostics[0].severity == "warning"
    assert result.stages[-1].status == "passed"
