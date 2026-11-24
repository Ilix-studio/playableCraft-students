// A simulation's page: the template for its runtime (assets/sim, generated from the website's iframe builder by
// scripts/build-android-sim-templates.mjs) with the sketch put in its place. Templates ship in the app, so a
// simulation runs offline.

import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { Platform } from "react-native";

const PLACEHOLDER = "/*__PC_SKETCH__*/";

const TEMPLATES = {
  shim: require("../../assets/sim/sim_shim.html"),
  bioZoom: require("../../assets/sim/sim_shim_biozoom.html"),
  full: require("../../assets/sim/sim_p5full.html"),
} as const;

const loaded = new Map<keyof typeof TEMPLATES, Promise<string>>();

async function read(key: keyof typeof TEMPLATES): Promise<string> {
  const asset = Asset.fromModule(TEMPLATES[key]);
  if (Platform.OS === "web") return (await fetch(asset.uri)).text();
  await asset.downloadAsync();
  return new File(asset.localUri ?? asset.uri).text();
}

/** Null when there is no sketch to run. */
export async function simulationHtml(code: string, runtime: string, bioZoom: boolean): Promise<string | null> {
  if (!code.trim()) return null;
  // Legacy library names ("p5.js", "matter.js", "Two.js") all ran on the shim.
  const key = runtime === "p5-full" ? "full" : bioZoom ? "bioZoom" : "shim";
  let template = loaded.get(key);
  if (!template) {
    template = read(key);
    loaded.set(key, template);
    template.catch(() => loaded.delete(key));
  }
  // Nothing inlined into the document may close the <script> that wraps it.
  const safe = code.replace(/<\/script>/gi, "<\\/script>");
  return (await template).split(PLACEHOLDER).join(safe);
}
