import { Button } from "@/components/Button";
import styles from "./welcome.module.css";

// Welcome.dc.html without its example card: Keside is designing what goes there.
export default function WelcomePage() {
  return (
    <main className={styles.screen}>
      <h1 className={styles.name}>Butterlogs</h1>
      <p className={styles.tagline}>Scale your recipes and know your real costs.</p>
      <div className={styles.actions}>
        <Button variant="primary" block href="/signup">
          Get started
        </Button>
        <Button block href="/login">
          I already have an account
        </Button>
      </div>
    </main>
  );
}
