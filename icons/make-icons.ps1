Add-Type -AssemblyName System.Drawing

$out = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) ''

function C([string]$hex) { return [System.Drawing.ColorTranslator]::FromHtml($hex) }

function GBrush([single]$x1, [single]$y1, [single]$x2, [single]$y2, [string]$a, [string]$b) {
  return [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.Point]::new($x1, $y1),
    [System.Drawing.Point]::new($x2, $y2),
    (C $a), (C $b))
}

function RoundPath([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $p = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $r * 2
  $p.AddArc([single]($x),      [single]($y),      $d, $d, 180, 90)
  $p.AddArc([single]($x + $w - $d), [single]($y),      $d, $d, 270, 90)
  $p.AddArc([single]($x + $w - $d), [single]($y + $h - $d), $d, $d, 0, 90)
  $p.AddArc([single]($x),      [single]($y + $h - $d), $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

$ON = @{
  1 = @(4)
  2 = @(0, 8)
  3 = @(0, 4, 8)
  4 = @(0, 2, 6, 8)
  5 = @(0, 2, 4, 6, 8)
  6 = @(0, 2, 3, 5, 6, 8)
}

function Die($g, [int]$face, [single]$cx, [single]$cy, [single]$s, [single]$rot) {
  $st = $g.Save()
  $g.TranslateTransform($cx, $cy)
  $g.RotateTransform($rot)

  $shadow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb([byte]90, [byte]0, [byte]0, [byte]0))
  $g.FillEllipse($shadow, [single](-$s * 0.60), [single]($s * 0.40), [single]($s * 1.20), [single]($s * 0.30))
  $shadow.Dispose()

  $x = [single](-$s / 2); $y = [single](-$s / 2)
  $body = RoundPath $x $y $s $s ([single]($s * 0.24))

  $fill = GBrush 0 $y 0 ([single]($y + $s)) '#fdfaf0' '#c9bda0'
  $g.FillPath($fill, $body)
  $fill.Dispose()

  $pen = [System.Drawing.Pen]::new((C '#e6c477'), [single][Math]::Max(1.0, $s * 0.03))
  $g.DrawPath($pen, $body)
  $pen.Dispose()

  $clip = RoundPath ([single]($x + $s * 0.06)) ([single]($y + $s * 0.05)) ([single]($s * 0.88)) ([single]($s * 0.52)) ([single]($s * 0.14))
  $hl = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.PointF]::new(0, $y),
    [System.Drawing.PointF]::new(0, [single]($y + $s * 0.6)),
    [System.Drawing.Color]::FromArgb([byte]185, [byte]255, [byte]255, [byte]255),
    [System.Drawing.Color]::FromArgb([byte]0, [byte]255, [byte]255, [byte]255))
  $g.SetClip($clip)
  $g.FillRectangle($hl, $x, $y, $s, [single]($s * 0.6))
  $g.ResetClip()
  $hl.Dispose(); $clip.Dispose(); $body.Dispose()

  $pr = [single]($s * 0.082)
  $off = [single]($s * 0.245)
  $pos = @(
    @([single](-$off), [single](-$off)), @([single]0, [single](-$off)), @($off, [single](-$off)),
    @([single](-$off), [single]0),      @([single]0, [single]0),      @($off, [single]0),
    @([single](-$off), $off),            @([single]0, $off),            @($off, $off)
  )
  $pb = [System.Drawing.SolidBrush]::new((C '#0d1526'))
  $pt = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb([byte]75, [byte]255, [byte]255, [byte]255))
  foreach ($i in $ON[$face]) {
    $p = $pos[$i]
    $g.FillEllipse($pt, [single]($p[0] - $pr - $s * 0.012), [single]($p[1] - $pr - $s * 0.012), [single]($pr * 2), [single]($pr * 2))
    $g.FillEllipse($pb, [single]($p[0] - $pr), [single]($p[1] - $pr), [single]($pr * 2), [single]($pr * 2))
  }
  $pb.Dispose(); $pt.Dispose()

  $g.Restore($st)
}

function Icon([string]$name, [int]$size, [bool]$maskable) {
  $bmp = [System.Drawing.Bitmap]::new($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

  $bg = if ($maskable) { GBrush 0 0 0 $size '#16233f' '#04070f' } else { GBrush 0 0 0 $size '#1a2a4d' '#04070f' }
  $g.FillRectangle($bg, 0, 0, $size, $size)
  if (-not $maskable) {
    $glow = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
      [System.Drawing.Point]::new(0, 0), [System.Drawing.Point]::new($size, $size),
      [System.Drawing.Color]::FromArgb([byte]95, [byte]96, [byte]160, [byte]255),
      [System.Drawing.Color]::FromArgb([byte]0, [byte]96, [byte]160, [byte]255))
    $g.FillRectangle($glow, 0, 0, $size, $size)
    $glow.Dispose()
  }
  $bg.Dispose()

  $s = [single]($size * $(if ($maskable) { 0.50 } else { 0.70 }))
  $gap = [single]($s * 0.17)
  $cy = [single]($size / 2)
  $lcx = [single]($size / 2 - ($s + $gap) / 2)
  $rcx = [single]($size / 2 + ($s + $gap) / 2)

  Die $g 5 $lcx $cy $s -13
  Die $g 3 $rcx $cy $s 13

  $path = Join-Path $out $name
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  "{0,-24} {1}x{1}" -f $name, $size
}

Icon 'icon-192.png' 192 $false
Icon 'icon-512.png' 512 $false
Icon 'icon-maskable-512.png' 512 $true
Icon 'apple-touch-icon.png' 180 $false
