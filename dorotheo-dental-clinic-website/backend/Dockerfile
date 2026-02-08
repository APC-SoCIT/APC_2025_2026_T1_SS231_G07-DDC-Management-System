# Use Python 3.11 slim base image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Set work directory
WORKDIR /app

# Install system dependencies required for WeasyPrint, Pillow, and PostgreSQL
# This includes all GTK libraries and fonts needed for PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Database dependencies
    libpq5 \
    libpq-dev \
    # SQLite dependencies
    libsqlite3-0 \
    libsqlite3-dev \
    # WeasyPrint (PDF generation) dependencies - GTK and Cairo libraries
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpangoft2-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    libcairo2 \
    libglib2.0-0 \
    libgobject-2.0-0 \
    libharfbuzz0b \
    libfontconfig1 \
    # Font packages for proper PDF text rendering
    fonts-dejavu-core \
    fonts-liberation \
    # Image processing dependencies (for Pillow)
    libjpeg62-turbo \
    libjpeg62-turbo-dev \
    libpng16-16 \
    libpng-dev \
    libtiff6 \
    libtiff-dev \
    libwebp7 \
    libwebp-dev \
    zlib1g \
    zlib1g-dev \
    libfreetype6 \
    libfreetype6-dev \
    liblcms2-2 \
    liblcms2-dev \
    # XML processing (required by WeasyPrint)
    libxml2 \
    libxslt1.1 \
    # Build tools (needed for some pip packages)
    gcc \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Upgrade pip and install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy project files
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p /app/media/documents /app/media/services /app/media/teeth_images && \
    mkdir -p /app/staticfiles && \
    chmod -R 755 /app/media /app/staticfiles

# Make release script executable
RUN chmod +x release.sh

# Expose port (Railway will override with PORT env variable)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/', timeout=5)" || exit 1

# Run release script (migrations, clinic setup, collectstatic) then start gunicorn
CMD ["sh", "-c", "./release.sh && python manage.py collectstatic --noinput && gunicorn dental_clinic.wsgi --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120 --log-file - --access-logfile - --error-logfile -"]
