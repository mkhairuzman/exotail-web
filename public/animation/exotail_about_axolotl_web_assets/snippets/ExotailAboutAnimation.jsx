export default function ExotailAboutAnimation() {
  return (
    <div className="relative w-full overflow-hidden rounded-[32px] bg-[#f1e8ff] aspect-[4/5] max-md:aspect-video">
      <video
        className="h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/assets/exotail/about/posters/exotail-about-axolotl-card-4x5-poster.webp"
        aria-label="Exotail axolotl mascot animation"
      >
        <source src="/assets/exotail/about/videos/exotail-about-axolotl-card-4x5.webm" type="video/webm" />
        <source src="/assets/exotail/about/videos/exotail-about-axolotl-card-4x5.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
