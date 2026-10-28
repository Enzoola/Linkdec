import Link from "next/link";
import { BioView } from "@/components/BioView";

const demoProfile = {
  name: "Ada Okafor", username: "ada", headline: "Product designer in Lagos",
  bio: "Case studies, talks and a monthly design newsletter.", theme: "lagos" as const,
  shape: "round" as const, fill: "solid" as const,
};
const demoLinks = [
  { id: "d1", kind: "social" as const, title: "LinkedIn", url: "", enabled: true },
  { id: "d2", kind: "social" as const, title: "Dribbble", url: "", enabled: true },
  { id: "d3", kind: "link" as const, title: "Portfolio", url: "https://example.com/work", enabled: true },
  { id: "d4", kind: "link" as const, title: "Monthly newsletter", url: "https://example.com/news", enabled: true },
  { id: "d5", kind: "link" as const, title: "Book a call", url: "https://example.com/call", enabled: true },
];

export default function Home() {
  return (
    <>
      <header className="wrap top">
        <span className="brand">Linkdeck</span>
        <Link className="b" href="/login">Log in</Link>
      </header>
      <main className="wrap">
        <section className="hero">
          <div>
            <h1 className="title">One link for everything you do.</h1>
            <p className="lead">
              Put your portfolio, products, socials and contact details on one page, then see which links people
              actually click. Free, fast and no ads.
            </p>
            <div className="cta">
              <Link className="b primary big" href="/login">Create your page</Link>
            </div>
          </div>
          <div className="demo" aria-label="Example link page">
            <BioView profile={demoProfile} links={demoLinks} preview />
          </div>
        </section>
        <ol className="steps">
          <li><h3>Claim your name</h3><p>Sign in with your email. No password to remember.</p></li>
          <li><h3>Add your links</h3><p>Pick a theme, reorder links and preview as you type.</p></li>
          <li><h3>Share and learn</h3><p>Put your address in your bio and watch views and clicks come in.</p></li>
        </ol>
      </main>
      <footer className="wrap foot">Linkdeck</footer>
    </>
  );
}
