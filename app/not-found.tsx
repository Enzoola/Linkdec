import Link from "next/link";

export default function NotFound() {
  return (
    <main className="card">
      <h1>Page not found</h1>
      <p>This link page does not exist, or its owner has removed it.</p>
      <Link className="b primary" href="/">Make your own on Linkdeck</Link>
    </main>
  );
}
