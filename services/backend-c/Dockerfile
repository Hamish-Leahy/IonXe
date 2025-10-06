FROM alpine:3.20 as build
RUN apk add --no-cache build-base
WORKDIR /app
COPY . /app/services/backend-c
RUN make -C /app/services/backend-c && cp /app/services/backend-c/ionxe-backend-c /bin/ionxe-backend-c

FROM alpine:3.20
WORKDIR /app
COPY --from=build /bin/ionxe-backend-c /usr/local/bin/ionxe-backend-c
EXPOSE 8081
CMD ["/usr/local/bin/ionxe-backend-c"]


