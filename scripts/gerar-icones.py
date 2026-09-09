#!/usr/bin/env python3
"""
Gera os icones do Pacto.

O simbolo e o X — o mesmo X que se marca na parede quando o dia fecha, que e
o mecanismo central do app. Ele e formado por dois tracos que se cruzam
(rosa e ciano, as duas pessoas), entrelacados no centro: nenhum dos dois
passa por cima do outro o tempo todo.

    python3 scripts/gerar-icones.py

Regrava public/icon-192.png, icon-512.png, icon-maskable-512.png,
apple-touch-icon.png e favicon.png.
"""
from PIL import Image, ImageDraw, ImageFilter
import os

S = 2048  # canvas de trabalho; tudo e reduzido com LANCZOS no fim
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")

FUNDO_TOPO = (28, 11, 56)     # #1c0b38
FUNDO_BASE = (11, 1, 22)      # #0b0116
ROSA = (224, 64, 251)         # #e040fb
CIANO = (34, 211, 238)        # #22d3ee


def fundo_gradiente(size):
    """Vertical do roxo profundo pro quase-preto, com um brilho radial no meio."""
    img = Image.new("RGB", (size, size), FUNDO_BASE)
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        c = tuple(round(FUNDO_TOPO[i] + (FUNDO_BASE[i] - FUNDO_TOPO[i]) * t) for i in range(3))
        d.line([(0, y), (size, y)], fill=c)

    # brilho atras do X
    glow = Image.new("L", (size, size), 0)
    gd = ImageDraw.Draw(glow)
    r = int(size * 0.34)
    gd.ellipse([size // 2 - r, size // 2 - r, size // 2 + r, size // 2 + r], fill=90)
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.13))
    img = Image.composite(Image.new("RGB", (size, size), (70, 28, 120)), img, glow)
    return img


def traco(draw, p0, p1, cor, largura, pontas=True):
    """Linha reta; `pontas` arredonda as extremidades (ImageDraw.line nao faz)."""
    draw.line([p0, p1], fill=cor, width=largura)
    if not pontas:
        return
    r = largura // 2
    for (x, y) in (p0, p1):
        draw.ellipse([x - r, y - r, x + r, y + r], fill=cor)


def ponto(a, b, t):
    return (round(a[0] + (b[0] - a[0]) * t), round(a[1] + (b[1] - a[1]) * t))


def desenhar_x(size, escala):
    """Camada RGBA so com o X, na `escala` indicada (fracao do lado)."""
    camada = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(camada)

    m = (1 - escala) / 2  # margem
    a0 = (round(size * m), round(size * m))
    a1 = (round(size * (1 - m)), round(size * (1 - m)))
    b0 = (round(size * (1 - m)), round(size * m))
    b1 = (round(size * m), round(size * (1 - m)))

    largura = round(size * escala * 0.235)

    traco(d, a0, a1, ROSA + (255,), largura)  # \  rosa, por baixo

    # Vinco: apaga uma faixa um pouco mais larga que o traco ciano, deixando
    # o FUNDO aparecer no cruzamento. E o que faz o rosa passar visivelmente
    # por tras em vez dos dois se fundirem num borrao no meio. (ImageDraw
    # escreve o valor cru no RGBA, entao pintar de alpha 0 apaga mesmo.)
    vinco = round(largura * 1.13)
    traco(d, b0, b1, (0, 0, 0, 0), vinco)

    traco(d, b0, b1, CIANO + (255,), largura)  # /  ciano, por cima
    return camada


def montar(size, escala_x, cantos):
    base = fundo_gradiente(size)

    if cantos:
        mascara = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mascara).rounded_rectangle([0, 0, size - 1, size - 1], radius=round(size * 0.225), fill=255)
    else:
        mascara = Image.new("L", (size, size), 255)

    x = desenhar_x(size, escala_x)

    # halo do X
    halo = x.filter(ImageFilter.GaussianBlur(size * 0.035))
    composto = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    composto.alpha_composite(base.convert("RGBA"))
    composto.alpha_composite(Image.blend(Image.new("RGBA", (size, size), (0, 0, 0, 0)), halo, 0.55))
    composto.alpha_composite(x)
    composto.putalpha(mascara)
    return composto


def salvar(img, nome, lado):
    caminho = os.path.normpath(os.path.join(OUT, nome))
    img.resize((lado, lado), Image.LANCZOS).save(caminho, "PNG")
    print(f"  {nome}  {lado}x{lado}")


if __name__ == "__main__":
    print("Gerando ícones do Pacto…")
    # 'any': quadrado arredondado, X ocupando bastante do quadro
    normal = montar(S, 0.60, cantos=True)
    salvar(normal, "icon-512.png", 512)
    salvar(normal, "icon-192.png", 192)
    salvar(normal, "apple-touch-icon.png", 180)
    salvar(normal, "favicon.png", 96)

    # 'maskable': sangra ate a borda e o simbolo vive dentro da zona segura (80%)
    maskable = montar(S, 0.44, cantos=False)
    salvar(maskable, "icon-maskable-512.png", 512)
    print("pronto.")
