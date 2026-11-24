// 把选择的文件压缩为 data URL（正方形裁剪 + 缩放），用于头像上传
export function fileToAvatarDataUrl(file, maxSize = 240, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      return reject(new Error('请选择图片文件'))
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('图片解析失败'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = maxSize
        canvas.height = maxSize
        const ctx = canvas.getContext('2d')
        // 居中裁剪为正方形
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2
        ctx.drawImage(img, sx, sy, side, side, 0, 0, maxSize, maxSize)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// 预设头像配色（简约随手记风格）
export const PRESET_COLORS = [
  '#ff7a45', '#ff4d4f', '#faad14', '#52c41a', '#36cfc9',
  '#1890ff', '#597ef7', '#9254de', '#ff85c0', '#8c8c8c'
]
