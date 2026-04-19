/** webpack asset/source: import foo from '*.md' gives the raw string */
declare module "*.md" {
  const content: string;
  export default content;
}
