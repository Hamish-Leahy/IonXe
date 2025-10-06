FROM rust:1.81-alpine as build
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY ../../Cargo.toml ../../Cargo.lock ./
COPY . ./services/middleware
COPY ../backend ./services/backend
RUN cargo build -p ionxe-middleware --release && cp target/release/ionxe-middleware /bin/ionxe-middleware

FROM alpine:3.20
WORKDIR /app
ENV BACKEND_RS=http://backend:8080 BACKEND_C=http://backend-c:8081
COPY --from=build /bin/ionxe-middleware /usr/local/bin/ionxe-middleware
COPY ../frontend/public /app/public
EXPOSE 8082
CMD ["/usr/local/bin/ionxe-middleware"]


