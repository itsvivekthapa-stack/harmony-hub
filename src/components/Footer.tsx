export function Footer() {
  return (
    <footer className="bg-maroon text-maroon-foreground">
      <div className="mx-auto max-w-7xl px-4 py-3 text-center text-xs sm:text-sm">
        Developed &amp; Programmed by{" "}
        <a
          href="mailto:itsvivekthapa@gmail.com"
          className="underline-offset-2 hover:underline"
        >
          Vivek Thapa
        </a>{" "}
        and{" "}
        <a
          href="mailto:nikunj.010218@kvsrodelhi.in"
          className="underline-offset-2 hover:underline"
        >
          Nikunj Kumar
        </a>
      </div>
    </footer>
  );
}
