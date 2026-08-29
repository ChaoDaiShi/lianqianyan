from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


def normalize_username(value: str) -> str:
    return value.strip().casefold()


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    display_name: str = Field(min_length=1, max_length=60)
    password: str = Field(min_length=8, max_length=128)
    captcha_token: str | None = Field(default=None, max_length=2048)

    @field_validator("username")
    @classmethod
    def valid_username(cls, value: str) -> str:
        normalized = normalize_username(value)
        if len(normalized) < 3 or not all(
            character.isalnum() or character in "_-." for character in normalized
        ):
            raise ValueError("用户名只能包含字母、数字、下划线、短横线和点")
        return normalized

    @field_validator("display_name")
    @classmethod
    def clean_display_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("显示名称不能为空")
        return cleaned

    @field_validator("password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        if not any(character.isalpha() for character in value) or not any(
            character.isdigit() for character in value
        ):
            raise ValueError("密码至少包含一个字母和一个数字")
        return value


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)
    captcha_token: str | None = Field(default=None, max_length=2048)


class CourseSelectionRequest(BaseModel):
    course_id: str = Field(min_length=1, max_length=36)


class AccountOut(BaseModel):
    id: str
    username: str
    display_name: str
    selected_course_id: str | None
    created_at: datetime


class SessionOut(BaseModel):
    account: AccountOut


class CourseOptionOut(BaseModel):
    id: str
    name: str
    description: str | None = None
