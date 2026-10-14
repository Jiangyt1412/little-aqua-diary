// # 简介从应用的发布元数据读取版本，避免多个页面显示不同版本。
import { APP_VERSION, RELEASE_DATE, RELEASE_NOTES } from './version.js';
for (const element of document.querySelectorAll('[data-version]')) element.textContent = `v${APP_VERSION}`;
document.querySelector('[data-release-date]').textContent = RELEASE_DATE;
for (const image of document.querySelectorAll('[data-media]')) image.src = `./media/${image.dataset.media}-v${APP_VERSION}.jpg`;
const video = document.querySelector('[data-demo]');
video.poster = `./media/cover-v${APP_VERSION}.jpg`;
video.querySelector('source').src = `./media/demo-v${APP_VERSION}.mp4`;
video.load();
document.querySelector('[data-video-download]').href = `./media/demo-v${APP_VERSION}.mp4`;
const notes = document.querySelector('[data-release-notes]');
for (const [title, description] of RELEASE_NOTES) {
  const article = document.createElement('article');
  const heading = document.createElement('h3');
  const body = document.createElement('p');
  heading.textContent = title;
  body.textContent = description;
  article.append(heading, body);
  notes.append(article);
}
