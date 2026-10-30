import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

// One identity per production build, shared by the compiled app and version.json.
const buildId=randomUUID().replaceAll('-','');

// Social crawlers read static HTML, so the image URL must be absolute in production.
// Amplify supplies AWS_APP_ID/AWS_BRANCH; SOCIAL_SITE_URL overrides this for custom domains.
const socialSiteUrl = process.env.SOCIAL_SITE_URL?.trim().replace(/\/$/, '') ||
  (process.env.AWS_APP_ID && process.env.AWS_BRANCH
    ? `https://${process.env.AWS_BRANCH}.${process.env.AWS_APP_ID}.amplifyapp.com`
    : '');
export default defineConfig({
  define:{__KHAMWAI_BUILD_ID__:JSON.stringify(buildId)},
  plugins:[
    react(),
    {
      name:'deployed-build-version',
      apply:'build',
      generateBundle(){
        this.emitFile({type:'asset',fileName:'version.json',source:JSON.stringify({build:buildId})+'\n'});
      }
    },
    {
      name:'absolute-social-preview-url',
      transformIndexHtml(html){
        if (!socialSiteUrl) return html;
        return html.replaceAll('content="/share-card.png"', `content="${socialSiteUrl}/share-card.png"`);
      }
    }
  ],
  server:{host:'0.0.0.0'},
  build:{rollupOptions:{input:{
    main:fileURLToPath(new URL('./index.html',import.meta.url)),
    admin:fileURLToPath(new URL('./khw-admin-14c2a0bd51d3fb0266f2ce0c9beb67c16dbf1e4700c5efaa0842e1a5.html',import.meta.url))
  }}}
});
