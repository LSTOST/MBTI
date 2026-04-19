/**
 * Static imports of all content markdown files.
 * webpack bundles each file as a raw string (asset/source rule in next.config.ts),
 * so no runtime fs access is needed — works in standalone, Docker, Vercel, etc.
 */

// MBTI types
import enfj from "../content/enfj.md";
import enfp from "../content/enfp.md";
import entj from "../content/entj.md";
import entp from "../content/entp.md";
import esfj from "../content/esfj.md";
import esfp from "../content/esfp.md";
import estj from "../content/estj.md";
import estp from "../content/estp.md";
import infj from "../content/infj.md";
import infp from "../content/infp.md";
import intj from "../content/intj.md";
import intp from "../content/intp.md";
import isfj from "../content/isfj.md";
import isfp from "../content/isfp.md";
import istj from "../content/istj.md";
import istp from "../content/istp.md";

// Zodiac signs
import aquarius from "../content/aquarius.md";
import aries from "../content/aries.md";
import cancer from "../content/cancer.md";
import capricorn from "../content/capricorn.md";
import gemini from "../content/gemini.md";
import leo from "../content/leo.md";
import libra from "../content/libra.md";
import pisces from "../content/pisces.md";
import sagittarius from "../content/sagittarius.md";
import scorpio from "../content/scorpio.md";
import taurus from "../content/taurus.md";
import virgo from "../content/virgo.md";

export const RAW_CONTENT: Record<string, string> = {
  // MBTI (lowercase keys)
  enfj,
  enfp,
  entj,
  entp,
  esfj,
  esfp,
  estj,
  estp,
  infj,
  infp,
  intj,
  intp,
  isfj,
  isfp,
  istj,
  istp,
  // Zodiac (slug keys)
  aquarius,
  aries,
  cancer,
  capricorn,
  gemini,
  leo,
  libra,
  pisces,
  sagittarius,
  scorpio,
  taurus,
  virgo,
};
