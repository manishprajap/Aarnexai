$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$resourceRoot = Join-Path $PSScriptRoot '..\android\app\src\main\res'
$densities = @(
  @{ Folder = 'mipmap-ldpi'; Size = 36 },
  @{ Folder = 'mipmap-mdpi'; Size = 48 },
  @{ Folder = 'mipmap-hdpi'; Size = 72 },
  @{ Folder = 'mipmap-xhdpi'; Size = 96 },
  @{ Folder = 'mipmap-xxhdpi'; Size = 144 },
  @{ Folder = 'mipmap-xxxhdpi'; Size = 192 }
)

function New-IconPoint([single]$X, [single]$Y, [single]$Scale) {
  return [System.Drawing.PointF]::new($X * $Scale, $Y * $Scale)
}

foreach ($density in $densities) {
  $size = [int]$density.Size
  $scale = $size / 100.0
  $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $background = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Rectangle(0, 0, $size, $size)),
    ([System.Drawing.Color]::FromArgb(7, 134, 233)),
    ([System.Drawing.Color]::FromArgb(32, 183, 233)),
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
  )

  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.FillRectangle($background, 0, 0, $size, $size)

  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $graphics.FillPolygon($white, [System.Drawing.PointF[]]@(
    (New-IconPoint 22 82 $scale),
    (New-IconPoint 46 22 $scale),
    (New-IconPoint 56 22 $scale),
    (New-IconPoint 39 63 $scale),
    (New-IconPoint 31 82 $scale)
  ))
  $graphics.FillPolygon($white, [System.Drawing.PointF[]]@(
    (New-IconPoint 54 22 $scale),
    (New-IconPoint 64 22 $scale),
    (New-IconPoint 88 82 $scale),
    (New-IconPoint 74 82 $scale)
  ))
  $graphics.FillPolygon($white, [System.Drawing.PointF[]]@(
    (New-IconPoint 34 60 $scale),
    (New-IconPoint 67 60 $scale),
    (New-IconPoint 73 72 $scale),
    (New-IconPoint 29 72 $scale)
  ))

  $orbit = New-Object System.Drawing.Drawing2D.GraphicsPath
  $orbit.AddBezier(
    (18 * $scale), (54 * $scale),
    (34 * $scale), (38 * $scale),
    (66 * $scale), (38 * $scale),
    (88 * $scale), (51 * $scale)
  )
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 245, 130, 32), (5 * $scale))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawPath($pen, $orbit)

  $folder = Join-Path $resourceRoot $density.Folder
  foreach ($name in @('ic_launcher.png', 'ic_launcher_round.png')) {
    $bitmap.Save((Join-Path $folder $name), [System.Drawing.Imaging.ImageFormat]::Png)
  }

  $pen.Dispose()
  $orbit.Dispose()
  $white.Dispose()
  $background.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

Write-Output 'Generated branded A launcher icons for all Android densities.'
