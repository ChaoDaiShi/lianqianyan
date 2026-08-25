from __future__ import annotations

import ast
import re
from dataclasses import dataclass

from app.lab.models import (
    CompileDiagnostic,
    CompileSimulationRequest,
    CompileSimulationResponse,
    CompileStage,
    CompileStageName,
)

_STAGE_LABELS: tuple[tuple[CompileStageName, str], ...] = (
    ("preprocess", "预处理"),
    ("syntax", "语法分析"),
    ("semantic", "语义检查"),
    ("link", "链接"),
    ("run", "模拟运行"),
)
_MAIN = re.compile(r"^int\s+main\s*\(\s*(?:void\s*)?\)\s*\{$")
_DECLARATION = re.compile(r"^int\s+([A-Za-z_]\w*)\s*=\s*(.+);$")
_ASSIGNMENT = re.compile(r"^([A-Za-z_]\w*)\s*=\s*(.+);$")
_PRINTF_INT = re.compile(r'^printf\s*\(\s*"(%d(?:\\n)?)"\s*,\s*(.+)\s*\)\s*;$')
_PRINTF_TEXT = re.compile(r'^printf\s*\(\s*"((?:\\[nt"\\]|[^"\\])*)"\s*\)\s*;$')
_RETURN = re.compile(r"^return\s+0\s*;$")
_ALLOWED_BINARY = (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod)
_ALLOWED_UNARY = (ast.UAdd, ast.USub)
_INT_MIN = -(2**31)
_INT_MAX = 2**31 - 1


@dataclass
class _Statement:
    kind: str
    line: int
    name: str | None = None
    expression: ast.Expression | None = None
    text: str | None = None
    newline: bool = False


class _IntegerOverflow(RuntimeError):
    pass


def _diagnostic(
    stage: CompileStageName,
    code: str,
    message: str,
    line: int | None = None,
    severity: str = "error",
) -> CompileDiagnostic:
    return CompileDiagnostic(
        stage=stage,
        severity=severity,
        line=line,
        code=code,
        message=message,
    )


def _strip_line_comment(line: str) -> str:
    in_string = False
    escaped = False
    index = 0
    while index < len(line) - 1:
        character = line[index]
        if escaped:
            escaped = False
        elif character == "\\" and in_string:
            escaped = True
        elif character == '"':
            in_string = not in_string
        elif not in_string and character == "/" and line[index + 1] == "/":
            return line[:index]
        index += 1
    return line


def _parse_expression(
    expression: str,
    line: int,
) -> tuple[ast.Expression | None, CompileDiagnostic | None]:
    if len(expression) > 500:
        return None, _diagnostic("syntax", "C1003", "表达式超过教学模拟长度限制。", line)
    try:
        parsed = ast.parse(expression, mode="eval")
    except (SyntaxError, RecursionError):
        return None, _diagnostic("syntax", "C1003", "表达式语法不完整。", line)

    for node in ast.walk(parsed):
        if isinstance(node, (ast.Expression, ast.Load)):
            continue
        if isinstance(node, ast.Constant):
            if type(node.value) is not int:
                return None, _diagnostic(
                    "syntax", "C1004", "教学子集只支持整数表达式。", line
                )
            continue
        if isinstance(node, ast.Name):
            continue
        if isinstance(node, ast.BinOp):
            if not isinstance(node.op, _ALLOWED_BINARY):
                return None, _diagnostic(
                    "syntax", "C1004", "表达式包含教学子集不支持的运算。", line
                )
            continue
        if isinstance(node, ast.UnaryOp):
            if not isinstance(node.op, _ALLOWED_UNARY):
                return None, _diagnostic(
                    "syntax", "C1004", "表达式包含教学子集不支持的运算。", line
                )
            continue
        if isinstance(node, (*_ALLOWED_BINARY, *_ALLOWED_UNARY)):
            continue
        return None, _diagnostic(
            "syntax", "C1004", "表达式包含教学子集不支持的结构。", line
        )
    return parsed, None


def _expression_names(expression: ast.Expression) -> set[str]:
    return {node.id for node in ast.walk(expression) if isinstance(node, ast.Name)}


def _checked(value: int) -> int:
    if value < _INT_MIN or value > _INT_MAX:
        raise _IntegerOverflow
    return value


def _c_divide(left: int, right: int) -> int:
    if right == 0:
        raise ZeroDivisionError
    quotient = abs(left) // abs(right)
    return -quotient if (left < 0) != (right < 0) else quotient


def _evaluate(node: ast.AST, variables: dict[str, int]) -> int:
    if isinstance(node, ast.Expression):
        return _evaluate(node.body, variables)
    if isinstance(node, ast.Constant) and type(node.value) is int:
        return _checked(node.value)
    if isinstance(node, ast.Name):
        return variables[node.id]
    if isinstance(node, ast.UnaryOp):
        value = _evaluate(node.operand, variables)
        return _checked(value if isinstance(node.op, ast.UAdd) else -value)
    if isinstance(node, ast.BinOp):
        left = _evaluate(node.left, variables)
        right = _evaluate(node.right, variables)
        if isinstance(node.op, ast.Add):
            return _checked(left + right)
        if isinstance(node.op, ast.Sub):
            return _checked(left - right)
        if isinstance(node.op, ast.Mult):
            return _checked(left * right)
        if isinstance(node.op, (ast.Div, ast.FloorDiv)):
            return _checked(_c_divide(left, right))
        if isinstance(node.op, ast.Mod):
            quotient = _c_divide(left, right)
            return _checked(left - quotient * right)
    raise ValueError("expression escaped validated teaching subset")


def _unescape_text(value: str) -> str:
    output: list[str] = []
    index = 0
    escapes = {"n": "\n", "t": "\t", '"': '"', "\\": "\\"}
    while index < len(value):
        if value[index] == "\\" and index + 1 < len(value):
            output.append(escapes[value[index + 1]])
            index += 2
        else:
            output.append(value[index])
            index += 1
    return "".join(output)


class TeachingCompilerSimulator:
    def simulate(self, request: CompileSimulationRequest) -> CompileSimulationResponse:
        stages = [
            CompileStage(name=name, label=label, status="skipped")
            for name, label in _STAGE_LABELS
        ]

        def fail(diagnostic: CompileDiagnostic) -> CompileSimulationResponse:
            stage_index = next(
                index for index, stage in enumerate(stages) if stage.name == diagnostic.stage
            )
            stages[stage_index].status = "failed"
            return CompileSimulationResponse(
                success=False,
                stages=stages,
                diagnostics=[diagnostic],
            )

        raw_lines = request.code.splitlines()
        if len(raw_lines) > 80:
            return fail(
                _diagnostic(
                    "preprocess",
                    "C0001",
                    "源代码超过教学模拟的 80 行限制。",
                )
            )

        source_lines: list[tuple[int, str]] = []
        for line_number, raw_line in enumerate(raw_lines, start=1):
            line = _strip_line_comment(raw_line).strip()
            if line.startswith("#"):
                if line != "#include <stdio.h>":
                    return fail(
                        _diagnostic(
                            "preprocess",
                            "C0101",
                            "教学子集只允许可选的 #include <stdio.h>。",
                            line_number,
                        )
                    )
                continue
            if line:
                source_lines.append((line_number, line))
        stages[0].status = "passed"

        if (
            len(source_lines) < 2
            or not _MAIN.fullmatch(source_lines[0][1])
            or source_lines[-1][1] != "}"
        ):
            line = source_lines[0][0] if source_lines else None
            return fail(
                _diagnostic(
                    "syntax",
                    "C1001",
                    "未找到完整的 int main() 主函数。",
                    line,
                )
            )

        statements: list[_Statement] = []
        for line_number, line in source_lines[1:-1]:
            declaration = _DECLARATION.fullmatch(line)
            assignment = _ASSIGNMENT.fullmatch(line)
            printf_int = _PRINTF_INT.fullmatch(line)
            printf_text = _PRINTF_TEXT.fullmatch(line)
            if declaration:
                expression, error = _parse_expression(declaration.group(2), line_number)
                if error:
                    return fail(error)
                statements.append(
                    _Statement(
                        "declare",
                        line_number,
                        name=declaration.group(1),
                        expression=expression,
                    )
                )
            elif printf_int:
                expression, error = _parse_expression(printf_int.group(2), line_number)
                if error:
                    return fail(error)
                statements.append(
                    _Statement(
                        "print_int",
                        line_number,
                        expression=expression,
                        newline=printf_int.group(1).endswith("\\n"),
                    )
                )
            elif printf_text:
                statements.append(
                    _Statement(
                        "print_text",
                        line_number,
                        text=_unescape_text(printf_text.group(1)),
                    )
                )
            elif _RETURN.fullmatch(line):
                statements.append(_Statement("return", line_number))
            elif assignment:
                expression, error = _parse_expression(assignment.group(2), line_number)
                if error:
                    return fail(error)
                statements.append(
                    _Statement(
                        "assign",
                        line_number,
                        name=assignment.group(1),
                        expression=expression,
                    )
                )
            else:
                return fail(
                    _diagnostic(
                        "syntax",
                        "C1002",
                        "该语句不在 c-edu 教学子集中。",
                        line_number,
                    )
                )

        if not statements or statements[-1].kind != "return":
            return fail(
                _diagnostic(
                    "syntax",
                    "C1003",
                    "主函数必须以 return 0; 结束。",
                    source_lines[-1][0],
                )
            )
        if any(statement.kind == "return" for statement in statements[:-1]):
            early_return = next(
                statement for statement in statements[:-1] if statement.kind == "return"
            )
            return fail(
                _diagnostic(
                    "syntax",
                    "C1003",
                    "return 0; 必须是主函数中的最后一条语句。",
                    early_return.line,
                )
            )
        stages[1].status = "passed"

        declared: set[str] = set()
        for statement in statements:
            if statement.kind == "declare":
                if statement.name in declared:
                    return fail(
                        _diagnostic(
                            "semantic",
                            "C2002",
                            f"变量 {statement.name} 被重复声明。",
                            statement.line,
                        )
                    )
            elif statement.kind == "assign" and statement.name not in declared:
                return fail(
                    _diagnostic(
                        "semantic",
                        "C2001",
                        f"变量 {statement.name} 尚未声明。",
                        statement.line,
                    )
                )

            if statement.expression is not None:
                missing = sorted(_expression_names(statement.expression) - declared)
                if missing:
                    return fail(
                        _diagnostic(
                            "semantic",
                            "C2001",
                            f"变量 {missing[0]} 尚未声明。",
                            statement.line,
                        )
                    )
            if statement.kind == "declare" and statement.name is not None:
                declared.add(statement.name)
        stages[2].status = "passed"
        stages[3].status = "passed"

        variables: dict[str, int] = {}
        output: list[str] = []
        try:
            for statement in statements:
                if statement.kind in {"declare", "assign"}:
                    if statement.name is None or statement.expression is None:
                        raise ValueError("invalid validated assignment")
                    variables[statement.name] = _evaluate(statement.expression, variables)
                elif statement.kind == "print_int":
                    if statement.expression is None:
                        raise ValueError("invalid validated printf")
                    value = _evaluate(statement.expression, variables)
                    output.append(str(value) + ("\n" if statement.newline else ""))
                elif statement.kind == "print_text":
                    output.append(statement.text or "")
        except ZeroDivisionError:
            return fail(
                _diagnostic(
                    "run",
                    "C3001",
                    "模拟运行遇到除数为零。",
                    statement.line,
                )
            )
        except _IntegerOverflow:
            return fail(
                _diagnostic(
                    "run",
                    "C3003",
                    "整数结果超出 c-edu 的 32 位范围。",
                    statement.line,
                )
            )

        stdout = "".join(output)
        diagnostics: list[CompileDiagnostic] = []
        if len(stdout) > 2_000:
            stdout = stdout[:2_000]
            diagnostics.append(
                _diagnostic(
                    "run",
                    "C3002",
                    "模拟输出已截断到 2000 个字符。",
                    severity="warning",
                )
            )
        stages[4].status = "passed"
        return CompileSimulationResponse(
            success=True,
            stages=stages,
            diagnostics=diagnostics,
            stdout=stdout,
        )
