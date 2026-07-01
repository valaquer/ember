import { a4 as ensure_array_like, a5 as attr_style, e as escape_html } from "../../chunks/index.js";
import "figma-squircle";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let activeSection = null;
    function ogLoad(key, fallback) {
      if (typeof localStorage === "undefined") return fallback;
      const v = localStorage.getItem("og-" + key);
      return v !== null ? parseFloat(v) : fallback;
    }
    ogLoad("headX", 31);
    ogLoad("headY", 16.4);
    ogLoad("markX", 62.3);
    ogLoad("markY", 75.1);
    ogLoad("headSize", 81);
    ogLoad("markHeight", 67);
    ogLoad("rbHeadX", 8);
    ogLoad("rbHeadY", 25);
    ogLoad("rbMarkX", 40);
    ogLoad("rbMarkY", 35);
    ogLoad("rbHeadSize", 54);
    ogLoad("rbMarkHeight", 40);
    JSON.parse(localStorage.getItem("og-wmMoodTags") || "{}");
    ogLoad("wmMarkX", 50);
    ogLoad("wmMarkY", 85);
    ogLoad("wmMarkSize", 23);
    ogLoad("wmOpacity", 18);
    const styleGuideSections = [
      "typography",
      "colors",
      "buttons",
      "spacing",
      "shimmers-glows",
      "borders-shadows",
      "logos",
      "aether-divider",
      "block-layouts",
      "breakpoints",
      "motion",
      "photography",
      "text-overlays",
      "watermarks",
      "chat-ui",
      "og-image",
      "reddit-banner",
      "spark-watermark"
    ];
    const styleGuideLabels = {
      "typography": "Typography",
      "colors": "Colors",
      "buttons": "Buttons",
      "spacing": "Spacing",
      "shimmers-glows": "Shimmers & Glows",
      "borders-shadows": "Borders & Shadows",
      "logos": "Logos",
      "aether-divider": "Aether Divider",
      "block-layouts": "Block Layouts",
      "breakpoints": "Breakpoints",
      "motion": "Motion",
      "photography": "Photography Aesthetics",
      "text-overlays": "Text Overlays",
      "watermarks": "Watermarks",
      "chat-ui": "Chat UI",
      "og-image": "OG Share Image",
      "reddit-banner": "Reddit Profile Banner",
      "spark-watermark": "Spark Watermark"
    };
    $$renderer2.push(`<div class="min-h-screen" style="background-color: #0B0D10; color: #E8E4DF;"><div class="max-w-5xl mx-auto px-8 py-16 space-y-12"><div><div class="flex flex-wrap gap-3"><!--[-->`);
    const each_array = ensure_array_like(styleGuideSections);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let section = each_array[$$index];
      $$renderer2.push(`<button class="px-5 py-3 rounded-lg font-body font-medium text-sm cursor-pointer transition-colors"${attr_style(`border: 1px solid rgba(255,255,255,0.15); ${activeSection === section ? "background-color: #AE0D46; color: #E8E4DF; border-color: #AE0D46;" : "background-color: rgba(255,255,255,0.08); color: #E8E4DF;"}`)}>${escape_html(styleGuideLabels[section])}</button>`);
    }
    $$renderer2.push(`<!--]--></div></div>  `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
export {
  _page as default
};
