#include "http.h"
#include "handlers.h"
#include "dimmer.h"

#include <string.h>
#include <stdlib.h>

int main(void) {
	const char *bind = getenv("IONXE_BACKEND_C_BIND");
	if (!bind || !*bind) bind = "127.0.0.1:8081";
	char host[64]; int port = 0;
	strncpy(host, "127.0.0.1", sizeof(host)); host[sizeof(host)-1] = '\0';
	const char *colon = strchr(bind, ':');
	if (colon) {
		size_t hlen = (size_t)(colon - bind);
		if (hlen >= sizeof(host)) hlen = sizeof(host)-1;
		memcpy(host, bind, hlen); host[hlen] = '\0';
		port = atoi(colon + 1);
	} else {
		strncpy(host, bind, sizeof(host)); host[sizeof(host)-1] = '\0';
		port = 8081;
	}
	dimmer_init();
	register_handlers();
	return http_serve(host, port);
}
