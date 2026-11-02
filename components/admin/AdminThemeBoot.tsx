/* Applies the saved admin theme to the .admin wrapper before paint (no flash). */
const SCRIPT = `(function(){try{var t=localStorage.getItem("fic-admin-theme");if(["day","lagoon","night","midnight"].indexOf(t)>-1)document.currentScript.parentElement.setAttribute("data-admin-theme",t)}catch(e){}})();`;

export default function AdminThemeBoot() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
