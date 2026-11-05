import branca from "../assets/logo-mark-white.png";
import colorida from "../assets/logo-mark-color.png";

/** Logo BMB: branca no tema escuro, colorida no tema claro. */
export function LogoBMB() {
  return (
    <span className="logo-bmb" role="img" aria-label="BMB">
      <img className="logo-white" src={branca} alt="" />
      <img className="logo-color" src={colorida} alt="" />
    </span>
  );
}
