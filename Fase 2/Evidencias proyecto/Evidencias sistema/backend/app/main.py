import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
import joblib
import pandas as pd
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

RUTA_MODELO = Path(os.getenv("MODELO_PATH", "/app/modelo/modelo_cuantiles.joblib"))
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
DOCS = os.getenv("HABILITAR_DOCS") == "1"

estado = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    estado["paquete"] = joblib.load(RUTA_MODELO)  # una sola vez, al iniciar
    estado["http"] = httpx.AsyncClient(timeout=5.0)
    yield
    await estado["http"].aclose()


app = FastAPI(
    title="HarvesTam API",
    lifespan=lifespan,
    docs_url="/docs" if DOCS else None,
    redoc_url=None,
    openapi_url="/openapi.json" if DOCS else None,
)


@app.exception_handler(RequestValidationError)
async def datos_invalidos(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "Datos inválidos: revise el mes y el diámetro."})


async def usuario_autenticado(request: Request, authorization: str = Header(default="")) -> str:
    request.state.t0 = time.perf_counter()
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sesión no válida.")
    token = authorization[7:].strip()
    try:
        r = await estado["http"].get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY},
        )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="No se pudo verificar la sesión.")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Sesión no válida o expirada.")
    return r.json()["id"]


class Entrada(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mes: int
    diametro: float = Field(gt=0, allow_inf_nan=False)


class Salida(BaseModel):
    q10: int
    mediana: int
    q90: int
    unidad: str = "g/m²"
    version_modelo: str
    tiempo_ms: int


@app.get("/api/health")
def health():
    return {"estado": "ok"}


@app.post("/api/predict", response_model=Salida)
def predict(entrada: Entrada, request: Request, usuario: str = Depends(usuario_autenticado)):
    p = estado["paquete"]
    if entrada.mes not in p["meses_validos"]:
        raise HTTPException(status_code=422, detail="El mes debe ser febrero o diciembre.")
    dmin, dmax = p["rango_diametro"]
    if not dmin <= entrada.diametro <= dmax:
        raise HTTPException(
            status_code=422,
            detail=f"El diámetro debe estar entre {dmin:.2f} y {dmax:.2f} m.",
        )

    x = pd.DataFrame({
        "month": [entrada.mes],
        "DIAMETER_ARBOL": [entrada.diametro],
        "DIAMETER_QUADRATIC": [entrada.diametro ** 2],
    })[p["columnas"]]

    valores = sorted(max(0.0, float(m.predict(x)[0])) for m in p["modelos"].values())
    tiempo = round((time.perf_counter() - request.state.t0) * 1000)
    return Salida(q10=round(valores[0]), mediana=round(valores[1]), q90=round(valores[2]),
                  version_modelo=p["version_modelo"], tiempo_ms=tiempo)