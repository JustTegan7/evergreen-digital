/* landing.js, entry point for niche/city landing pages in /websites/.
   Lighter than main.js: no booking modal, recommender or showcase here.
   CTAs link back to the homepage (/#contact, /#showcase?biz=...). */
import { initNavShadow } from "./nav.js";
import { initAuditWidgets } from "./audit.js";

initNavShadow();
initAuditWidgets();
