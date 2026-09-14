FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    # O ONNX Runtime dimensiona seu pool de threads pelo numero de cores do
    # HOST, nao pela fatia de CPU do container. Numa VPS de 4 vCPUs dividida com
    # o backend e o Postgres, isso vira dezenas de threads disputando os mesmos
    # nucleos: o custo de troca de contexto supera o ganho de paralelismo e a
    # latencia piora. Uma placa por vez nao precisa de paralelismo interno.
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    ORT_DISABLE_ALL_OPTIMIZATION=0

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --disable-pip-version-check --no-input --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
