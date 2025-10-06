.text
.globl lut_apply_x86_64
.type lut_apply_x86_64,@function
# void lut_apply_x86_64(const uint8_t *lut, const uint8_t *in, uint8_t *out, int len)
lut_apply_x86_64:
	push %rbp
	mov %rsp, %rbp
	# rdi=lut, rsi=in, rdx=out, ecx=len
	cmp $0, %ecx
	jle .Ldone
.Lloop:
	movzbq (%rsi), %rax
	movzbq (%rdi,%rax,1), %rax
	mov %al, (%rdx)
	inc %rsi
	inc %rdx
	dec %ecx
	jg .Lloop
.Ldone:
	pop %rbp
	ret
