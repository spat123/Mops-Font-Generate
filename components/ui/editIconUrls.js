/** Статические SVG из `public/icons/edit/` (URL, не webpack-import). */
function publicEditIcon(filename) {
  return `/icons/edit/${encodeURIComponent(filename)}`;
}

export const gridIconUrl = publicEditIcon('Grid.svg');
export const rowIconUrl = publicEditIcon('Row.svg');
export const alarmIconUrl = publicEditIcon('Alarm.svg');
export const ideaIconUrl = publicEditIcon('Idea.svg');
export const downloudIconUrl = publicEditIcon('Downloud.svg');
export const editIconUrl = publicEditIcon('Edit.svg');
export const enterIconUrl = publicEditIcon('Enter.svg');
export const linkIconUrl = publicEditIcon('Link.svg');
export const settingIconUrl = publicEditIcon('Setting.svg');
export const notificationIconUrl = publicEditIcon('Notification.svg');
export const moveAndSwapIconUrl = publicEditIcon('Move and swap.svg');
export const delIconUrl = publicEditIcon('Del.svg');
export const shareIconUrl = publicEditIcon('Share.svg');
export const searchIconUrl = publicEditIcon('Search.svg');
export const updateIconUrl = publicEditIcon('Update.svg');
export const loginIconUrl = publicEditIcon('Login.svg');
export const userIconUrl = publicEditIcon('User.svg');
export const heartIconUrl = publicEditIcon('Heart.svg');
