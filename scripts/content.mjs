// Profile content, copied from yuna1107.com.
export const SITE = 'https://yuna1107.com';
// The site's Worker is also served on workers.dev. Cloudflare's bot protection on
// yuna1107.com blocks GitHub Actions runners, so the build falls back to it.
const WORKER = 'https://yuna1107-com.hn19t07m.workers.dev';
export const API = {
  github: [`${SITE}/api/github`, `${WORKER}/api/github`],
  music: [`${SITE}/api/music`, `${WORKER}/api/music`],
};

export const hero = {
  name: 'yuna1107',
  taglineJa: '情報技術は世界を変える',
  taglineEn: 'Information technology is changing the world',
};

export const about = {
  name: 'yuna1107',
  role: 'Student — Flutter / Mobile App',
  avatar: 'me.jpg',
  items: [
    { label: 'CORE FOCUS', value: 'Mobile App Development / Cross Platform App Development' },
    { label: 'LOCATION', value: 'Aizu-Wakamatsu, Fukushima' },
  ],
  bio: [
    '会津大学 コンピュータ理工学部1年。',
    '「情報技術は世界を変える」をモットーに、Flutterを使ったAndroidアプリ開発や、Javaを用いたシステム開発に挑戦しています。',
    '現在は個人でのアプリ開発を中心に活動しています。',
    '趣味は読書と音楽を聴くことです。',
    '最近は Cellmates の更新を毎回楽しみにしています。',
  ],
};

export const contacts = [
  { id: 'website', label: 'Website', value: 'yuna1107.com', icon: 'globe', href: SITE },
  { id: 'mail', label: 'E-mail', value: 'information@yuna1107.com', icon: 'envelope', href: 'mailto:information@yuna1107.com' },
  { id: 'github', label: 'GitHub', value: '@yuna1107-k', icon: 'github', href: 'https://github.com/yuna1107-k' },
  { id: 'x', label: 'X (Twitter)', value: '@yuna1107m', icon: 'x-twitter', href: 'https://x.com/yuna1107m' },
  { id: 'instagram', label: 'Instagram', value: '@yuna1107k', icon: 'instagram', href: 'https://www.instagram.com/yuna1107k/' },
  { id: 'mixi2', label: 'mixi2', value: '@yuna1107', icon: 'comments', href: 'https://mixi.social/@yuna1107' },
  { id: 'blog', label: 'Blog', value: 'blog.yuna1107.com', icon: 'blog', href: 'https://blog.yuna1107.com' },
  { id: 'note', label: 'note', value: 'note.com/yuna1107', icon: 'pen-nib', href: 'https://note.com/yuna1107' },
];
