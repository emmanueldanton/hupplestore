import Image from "next/image";
import logo from "@/app/logo.png";

/**
 * Le logo posé sur une pastille blanche.
 *
 * Le logo est bleu sur fond transparent : posé directement sur le dégradé de
 * marque, il disparaîtrait. La pastille lui rend son contraste tout en
 * conservant sa couleur d'origine, plutôt que de le dénaturer en blanc.
 *
 * L'image est importée, et non référencée par une URL publique : servi depuis
 * `public/`, le fichier passerait par le garde d'accès, qui le redirigerait
 * vers la page de connexion. L'optimiseur recevrait alors du HTML et
 * refuserait l'image. L'import produit une URL statique hors de sa portée.
 */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl bg-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <Image
        src={logo}
        alt="HUPPLE STORE"
        width={size}
        height={size}
        priority
        // Le fichier porte une marge interne : on agrandit pour la rogner.
        style={{ width: size * 0.94, height: size * 0.94, objectFit: "contain" }}
      />
    </span>
  );
}
