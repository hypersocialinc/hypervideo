require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'StackedAlphaVideo'
  s.version        = package['version']
  s.summary        = 'Native stacked-alpha video player with Metal rendering'
  s.description    = 'A native iOS module for playing stacked-alpha videos with GPU-accelerated alpha compositing'
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platform       = :ios, '15.1'
  s.swift_version  = '5.4'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,mm,swift}'
end
