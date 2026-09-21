Add-Type -AssemblyName System.Drawing

$srcPath = "C:\MyProjects\chibishoppu-pos\public\ChibishoppuLogo2.jpeg"
$resRoot = "C:\MyProjects\chibishoppu-pos\android\app\src\main\res"

$src = [System.Drawing.Image]::FromFile($srcPath)

# density -> [launcher px, foreground px]
$densities = @{
  "mipmap-mdpi"    = @(48, 108)
  "mipmap-hdpi"    = @(72, 162)
  "mipmap-xhdpi"   = @(96, 216)
  "mipmap-xxhdpi"  = @(144, 324)
  "mipmap-xxxhdpi" = @(192, 432)
}

function New-SquareLogo([int]$canvas, [double]$fillRatio, [bool]$round) {
  $bmp = New-Object System.Drawing.Bitmap($canvas, $canvas)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  if ($round) {
    $g.Clear([System.Drawing.Color]::Transparent)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $canvas, $canvas)
    $g.SetClip($path)
    $g.Clear([System.Drawing.Color]::White)
  } else {
    $g.Clear([System.Drawing.Color]::White)
  }

  # fit source inside fillRatio box, centered
  $box = [int]($canvas * $fillRatio)
  $scale = [Math]::Min($box / $src.Width, $box / $src.Height)
  $w = [int]($src.Width * $scale)
  $h = [int]($src.Height * $scale)
  $x = [int](($canvas - $w) / 2)
  $y = [int](($canvas - $h) / 2)
  $g.DrawImage($src, $x, $y, $w, $h)

  $g.Dispose()
  return $bmp
}

foreach ($dir in $densities.Keys) {
  $launcherPx, $fgPx = $densities[$dir]
  $outDir = Join-Path $resRoot $dir

  # square launcher icon: logo fills most of canvas
  $sq = New-SquareLogo $launcherPx 0.92 $false
  $sq.Save((Join-Path $outDir "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $sq.Dispose()

  # round launcher icon: circular clip (lower fill keeps art inside the circle)
  $rd = New-SquareLogo $launcherPx 0.82 $true
  $rd.Save((Join-Path $outDir "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $rd.Dispose()

  # adaptive foreground: logo inside ~66% safe zone, transparent margin
  $fg = New-SquareLogo $fgPx 0.66 $false
  # make white background transparent for foreground layer
  $fg.MakeTransparent([System.Drawing.Color]::White)
  $fg.Save((Join-Path $outDir "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $fg.Dispose()

  Write-Output "generated $dir ($launcherPx/$fgPx)"
}

$src.Dispose()
Write-Output "done"
