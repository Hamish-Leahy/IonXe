CC ?= cc
CFLAGS ?= -O2 -Wall -Wextra -std=c11
LDFLAGS ?=

BIN := ionxe-backend-c
SRC := src/main.c src/http.c src/json.c src/state.c src/dimmer.c
ASM :=
ifeq ($(shell uname -m),arm64)
ASM := src/dimmer_arm64.S
endif
OBJ := $(SRC:.c=.o) $(ASM:.S=.o)

PREFIX ?= /usr/local

.PHONY: all clean run install

all: $(BIN)

$(BIN): $(OBJ)
	$(CC) $(CFLAGS) -o $@ $(OBJ) $(LDFLAGS)

%.o: %.c
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@

%.o: %.S
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@

run: $(BIN)
	./$(BIN)

install: $(BIN)
	install -d $(DESTDIR)$(PREFIX)/bin
	install -m 0755 $(BIN) $(DESTDIR)$(PREFIX)/bin/$(BIN)

clean:
	rm -f $(OBJ) $(BIN)


