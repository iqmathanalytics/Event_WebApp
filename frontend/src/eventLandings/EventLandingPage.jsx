import { Navigate, useParams } from "react-router-dom";
import { getEventLandingConfig } from "./registry";
import LandingPageMeta from "./LandingPageMeta";
import LandingNav from "./LandingNav";
import LandingHero from "./LandingHero";
import LandingAbout from "./LandingAbout";
import LandingMedia from "./LandingMedia";
import LandingExperience from "./LandingExperience";
import LandingTickets from "./LandingTickets";
import LandingVipPerk from "./LandingVipPerk";
import LandingActivities from "./LandingActivities";
import LandingSponsors from "./LandingSponsors";
import LandingPresenters from "./LandingPresenters";
import LandingFooter from "./LandingFooter";
import "./landingTheme.css";

export default function EventLandingPage() {
  const { eventSlug } = useParams();
  const config = getEventLandingConfig(eventSlug);

  if (!config) {
    return <Navigate to="/404" replace />;
  }

  const accent = config.brand?.accentColor;
  const style = accent
    ? { "--el-accent-override": accent }
    : undefined;

  return (
    <div className="event-landing" style={style} data-event-slug={config.slug}>
      <LandingPageMeta seo={config.seo} brandName={config.brand?.name} />
      <LandingNav config={config} />
      <LandingHero hero={config.hero} />
      <LandingAbout about={config.about} />
      <LandingMedia media={config.media} />
      <LandingExperience experience={config.experience} />
      <LandingTickets tickets={config.tickets} />
      <LandingVipPerk vipPerk={config.vipPerk} />
      <LandingActivities activities={config.activities} />
      <LandingSponsors sponsors={config.sponsors} />
      <LandingPresenters presenters={config.presenters} />
      <LandingFooter footer={config.footer} />
    </div>
  );
}
