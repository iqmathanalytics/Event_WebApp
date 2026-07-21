import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import LandingReveal from "./LandingReveal";

export default function LandingMedia({ media }) {
  if (!media?.items?.length) return null;
  const id = media.id || "media";

  return (
    <section className="el-section el-media" id={id}>
      <div className="el-container">
        <LandingReveal>
          <p className="el-eyebrow">Gallery</p>
          <h2 className="el-heading">{media.heading || "Media"}</h2>
        </LandingReveal>

        <LandingReveal delay={0.08}>
          <Swiper
            modules={[Autoplay, Pagination]}
            spaceBetween={16}
            slidesPerView={1.1}
            breakpoints={{
              640: { slidesPerView: 1.4 },
              900: { slidesPerView: 2.1 },
            }}
            pagination={{ clickable: true }}
            autoplay={{ delay: 4500, disableOnInteraction: false }}
          >
            {media.items.map((item, idx) => (
              <SwiperSlide key={`${item.type}-${idx}`}>
                <div className="el-media__slide">
                  {item.type === "external" ? (
                    <a
                      className="el-media__external"
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={
                        item.thumbnail
                          ? {
                              backgroundImage: `linear-gradient(rgba(7,5,9,0.55), rgba(7,5,9,0.75)), url(${item.thumbnail})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    >
                      {item.label || "Watch"}
                    </a>
                  ) : (
                    <>
                      <img src={item.src} alt={item.alt || ""} />
                      {item.caption ? (
                        <div className="el-media__caption">{item.caption}</div>
                      ) : null}
                    </>
                  )}
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </LandingReveal>
      </div>
    </section>
  );
}
