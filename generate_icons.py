from PIL import Image, ImageDraw, ImageFilter


def rounded_rectangle(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def make_icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (246, 247, 244, 255))
    draw = ImageDraw.Draw(image)

    radius = round(size * 0.25)
    inset = round(size * 0.045)
    rounded_rectangle(draw, (inset, inset, size - inset, size - inset), radius, (249, 253, 250, 255))

    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.rounded_rectangle(
        (inset, inset, size - inset, size - inset),
        radius=radius,
        fill=(88, 201, 146, 36),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=max(2, size // 28)))
    image.alpha_composite(glow)

    arrow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    arrow_draw = ImageDraw.Draw(arrow)
    arrow_points = [
        (size * 0.26, size * 0.76),
        (size * 0.43, size * 0.76),
        (size * 0.43, size * 0.55),
        (size * 0.66, size * 0.55),
        (size * 0.66, size * 0.42),
        (size * 0.82, size * 0.42),
        (size * 0.82, size * 0.24),
        (size * 0.93, size * 0.24),
        (size * 0.74, size * 0.07),
        (size * 0.55, size * 0.24),
        (size * 0.66, size * 0.24),
        (size * 0.66, size * 0.35),
        (size * 0.26, size * 0.35),
    ]
    arrow_draw.polygon(arrow_points, fill=(46, 159, 112, 50))
    arrow = arrow.filter(ImageFilter.GaussianBlur(radius=max(2, size // 40)))
    image.alpha_composite(arrow)

    steps = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    steps_draw = ImageDraw.Draw(steps)
    step_color = (61, 187, 129, 255)
    shadow_color = (24, 93, 65, 50)
    step_width = size * 0.15
    gap = size * 0.05
    base_x = size * 0.24
    base_y = size * 0.71
    heights = [size * 0.12, size * 0.22, size * 0.33]

    for index, height in enumerate(heights):
        x1 = base_x + index * (step_width + gap)
        y1 = base_y - height
        x2 = x1 + step_width
        y2 = base_y
        steps_draw.rounded_rectangle(
            (x1 + size * 0.008, y1 + size * 0.014, x2 + size * 0.008, y2 + size * 0.014),
            radius=size * 0.03,
            fill=shadow_color,
        )
        steps_draw.rounded_rectangle(
            (x1, y1, x2, y2),
            radius=size * 0.03,
            fill=step_color,
        )

    image.alpha_composite(steps)

    return image.convert("RGB")


def main():
    make_icon(180).save("apple-touch-icon.png", format="PNG")
    make_icon(32).save("favicon.png", format="PNG")


if __name__ == "__main__":
    main()
