FROM rust:1.75-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libasound2-dev \
    libfftw3-dev \
    libavcodec-dev \
    libavformat-dev \
    libavutil-dev \
    libswscale-dev \
    libavdevice-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Cargo files
COPY Cargo.toml Cargo.lock ./

# Create dummy main.rs to build dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies
RUN cargo build --release

# Copy source code
COPY src ./src

# Build the application
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libssl3 \
    libasound2 \
    libfftw3-3 \
    libavcodec59 \
    libavformat59 \
    libavutil57 \
    libswscale6 \
    libavdevice59 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary
COPY --from=builder /app/target/release/ionxe-ai-lighting /app/

# Expose port
EXPOSE 8084

# Set environment variables
ENV RUST_LOG=info
ENV MISTRAL_API_KEY=your-mistral-api-key
ENV AUGMENT3D_ENDPOINT=http://localhost:8083

# Run the application
CMD ["./ionxe-ai-lighting"]
