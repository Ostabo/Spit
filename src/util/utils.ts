export function formatModelSize(size: number): string {
    if (size >= 1024 * 1024 * 1024) {
        return (size / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    } else if (size >= 1024 * 1024) {
        return (size / (1024 * 1024)).toFixed(2) + " MB";
    } else if (size >= 1024) {
        return (size / 1024).toFixed(2) + " KB";
    } else {
        return size + " B";
    }
}
