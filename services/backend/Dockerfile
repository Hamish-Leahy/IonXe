FROM rust:1.81-alpine as build
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY ../../Cargo.toml ../../Cargo.lock ./
COPY . ./services/backend
RUN cargo build -p ionxe-backend --release && cp target/release/ionxe-backend /bin/ionxe-backend

FROM alpine:3.20
WORKDIR /app
COPY --from=build /bin/ionxe-backend /usr/local/bin/ionxe-backend
EXPOSE 8080
CMD ["/usr/local/bin/ionxe-backend"]


