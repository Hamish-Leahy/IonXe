# Use a Rust base image
FROM rust:1.74-slim-bookworm as builder

# Set the working directory
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libasound2-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Cargo.toml and Cargo.lock to leverage Docker cache
COPY Cargo.toml Cargo.lock ./

# Build dummy project to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src target/release/deps/* target/release/build/*

# Copy source code
COPY src ./src

# Build the application
RUN cargo build --release

# --- Final stage ---
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /app/target/release/show-automation .

# Expose the port the application listens on
EXPOSE 8086

# Run the application
CMD ["./show-automation"]
