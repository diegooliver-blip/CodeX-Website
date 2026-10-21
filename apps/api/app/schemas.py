import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- auth ---
class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int


class RefreshIn(BaseModel):
    refresh_token: str


class UserOut(ORM):
    id: uuid.UUID
    email: str
    name: str
    role: str


# --- courses ---
LessonKind = Literal["video", "pdf", "text"]
CourseStatus = Literal["draft", "published"]


class LessonIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    slug: str = Field(pattern=r"^[a-z0-9-]+$", max_length=160)
    kind: LessonKind = "video"
    body: str = ""
    asset_key: str | None = None
    duration_min: int = Field(default=0, ge=0)
    is_free: bool = False
    position: int = 0


class LessonOut(ORM):
    id: uuid.UUID
    title: str
    slug: str
    kind: str
    body: str
    asset_key: str | None
    duration_min: int
    is_free: bool
    position: int


class PublicLesson(BaseModel):
    title: str
    slug: str
    kind: str
    duration_min: int
    is_free: bool
    locked: bool
    body: str = ""
    asset_url: str | None = None


class ModuleIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    position: int = 0


class ModuleOut(ORM):
    id: uuid.UUID
    title: str
    position: int
    lessons: list[LessonOut] = []


class PublicModule(BaseModel):
    title: str
    lessons: list[PublicLesson]


class CourseIn(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9-]+$", max_length=160)
    title: str = Field(min_length=1, max_length=200)
    subtitle: str = ""
    description: str = ""
    category: str = "IA aplicada"
    level: str = "Intermedio"
    cover_key: str | None = None
    price_mxn: int | None = Field(default=None, ge=0)
    status: CourseStatus = "draft"


class CoursePatch(BaseModel):
    slug: str | None = Field(default=None, pattern=r"^[a-z0-9-]+$", max_length=160)
    title: str | None = None
    subtitle: str | None = None
    description: str | None = None
    category: str | None = None
    level: str | None = None
    cover_key: str | None = None
    price_mxn: int | None = None
    status: CourseStatus | None = None


class CourseOut(ORM):
    id: uuid.UUID
    slug: str
    title: str
    subtitle: str
    description: str
    category: str
    level: str
    cover_key: str | None
    price_mxn: int | None
    status: str
    updated_at: datetime
    modules: list[ModuleOut] = []


class PublicCourseCard(BaseModel):
    slug: str
    title: str
    subtitle: str
    category: str
    level: str
    cover_url: str | None
    price_mxn: int | None
    lessons: int
    minutes: int
    venta_activa: bool = False  # has a price and a payment provider is configured


class PublicCourse(PublicCourseCard):
    description: str
    modules: list[PublicModule]


# --- students and payments ---
class StudentSignupIn(BaseModel):
    email: EmailStr
    nombre: str = Field(min_length=2, max_length=200)
    password: str = Field(min_length=10, max_length=200)


class StudentOut(BaseModel):
    id: uuid.UUID
    email: str
    nombre: str
    verificado: bool


class StudentEmailIn(BaseModel):
    email: EmailStr


class StudentTokenIn(BaseModel):
    token: str = Field(min_length=20, max_length=200)


class StudentResetIn(StudentTokenIn):
    password: str = Field(min_length=10, max_length=200)


class StudentCourse(PublicCourse):
    inscrito: bool


class CheckoutIn(BaseModel):
    curso: str = Field(min_length=1, max_length=160)


class CheckoutOut(BaseModel):
    orden_id: uuid.UUID
    url: str


class OrderOut(BaseModel):
    id: uuid.UUID
    estado: str
    monto_centavos: int
    moneda: str
    proveedor: str
    curso: str  # course slug
    creado_en: datetime


class SimulatedPaymentIn(BaseModel):
    estado: Literal["pagado", "fallido"] = "pagado"


# --- uploads ---
class PresignIn(BaseModel):
    filename: str = Field(max_length=200)
    content_type: str = Field(max_length=120)
    folder: Literal["videos", "pdfs", "covers"] = "videos"


class PresignOut(BaseModel):
    key: str
    upload_url: str


# --- leads ---
class LeadIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    company: str = Field(default="", max_length=200)
    phone: str = Field(default="", max_length=40)
    service: str = Field(default="", max_length=80)
    message: str = Field(default="", max_length=4000)
    source: Literal["contacto", "academia", "chat"] = "contacto"
    course_slug: str = Field(default="", max_length=160)


class LeadOut(ORM):
    id: uuid.UUID
    name: str
    email: str
    company: str
    phone: str
    service: str
    message: str
    source: str
    course_slug: str
    created_at: datetime


# --- chat / rag ---
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatIn(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)


class SourceOut(BaseModel):
    title: str
    url: str


class DocumentOut(ORM):
    id: uuid.UUID
    source: str
    ref: str
    title: str
    url: str
    created_at: datetime
