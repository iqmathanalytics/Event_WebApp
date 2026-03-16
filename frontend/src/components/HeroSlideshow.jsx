import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";

const slides = [
  {
    image:
      "https://plus.unsplash.com/premium_photo-1683129651802-1c7ba429a137?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    label: "Music Festival Night"
  },
  {
    image:
      "https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    label: "Comedy Show"
  },
  {
    image:
      "https://images.unsplash.com/photo-1566808925909-1485ad6cddb3?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    label: "Food & Lifestyle Events"
  },
  {
    image:
      "https://images.unsplash.com/photo-1541445976433-f466f228a409?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    label: "City Fireworks Festival"
  },
  {
    image:
      "https://images.unsplash.com/photo-1522158637959-30385a09e0da?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    label: "Live Concert Crowd"
  },
  {
    image:
      "https://images.unsplash.com/photo-1561489396-888724a1543d?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    label: "Professional Networking Event"
  }
];

function HeroSlideshow() {
  return (
    <div className="hero-swiper overflow-hidden rounded-3xl border border-white/10 bg-slate-900/20 shadow-2xl">
      <Swiper
        modules={[Autoplay, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        loop
        speed={850}
        autoplay={{ delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true }}
        className="w-full"
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.image}>
            <article className="relative aspect-[16/9] w-full">
              <img
                src={slide.image}
                alt={slide.label}
                loading="lazy"
                className="hero-slide-image h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <p className="text-sm font-semibold tracking-wide text-white drop-shadow sm:text-base">{slide.label}</p>
              </div>
            </article>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

export default HeroSlideshow;
