# encoding: utf-8

SRC_PATH    = File.realpath(File.join(File.dirname(__FILE__),'javascripts'))
BUILD_PATH  = File.realpath(File.join(File.dirname(__FILE__),'.'))
JS_PACKAGE = %w[
  utils
  grid grid-cell
  monster player
  tower tower-menu tower-meta-menu
  game
  boot
]

module Merger
  extend self

  def run!
    merge_package = JS_PACKAGE
    merged = merge_package.inject('') do |out, file|
      f = File.read("#{SRC_PATH}/#{file}.js")
      out << f << ";\n"
    end
    File.open("#{BUILD_PATH}/cubi.js","w+") do |fh|
      fh.write merged
    end
  end

end

module Compiler
  extend self

  def run!
    files = Dir[BUILD_PATH+'/*.js'].reject{|f| f =~ /\.min\.js\Z/}
    files.each do |file|
      input_file  = "--js #{file}"
      output_file = " --js_output_file #{file.sub(/\.js\Z/,'.min.js')}"
      ###
      # --compilation_level WHITESPACE_ONLY | SIMPLE_OPTIMIZATIONS | ADVANCED_OPTIMIZATIONS
      cmd = ["java", "-jar vendor/compiler.jar --compilation_level WHITESPACE_ONLY", input_file, output_file].join(' ')
      system cmd
    end
  end

end

module Uglifier
  extend self

  def run!
    files = Dir[BUILD_PATH+'/*.js'].reject{|f| f =~ /\.min\.js\Z/}
    files.each do |file|
      input_file  = "#{file}"
      output_file = " -o #{file.sub(/\.js\Z/,'.min.js')}"
      cmd = ["node_modules/uglify-js/bin/uglifyjs", output_file, input_file].join(' ')
      system cmd
    end
  end

end

module CSSminifier
  extend self

  def run!
    input_file  = "#{BUILD_PATH}/stylesheets/screen.css"
    output_file = "-o #{BUILD_PATH}/stylesheets/cubi.css"
    cmd = ["node node_modules/yuicompressor/nodejs/cli.js", output_file, input_file].join(' ')
    system cmd
  end
end

module Compressor
  extend self

  def run!
    files = Dir[BUILD_PATH+'/*.js']
    files.each do |file|
      cmd = ["gzip -f -c -9",file,"> #{file}.gz"].join(' ')
      system cmd
    end
  end
end

desc "Merge files for standalone Javascript usage"
task :merge do
  puts "-- Merging for standalone usage ..."
  Merger.run!
end

desc "Compile/minify merged files"
task :compile do
  puts "-- Compiling (Closure Compiler) ..."
  Compiler.run!
end

desc "Compile with UglifyJS"
task :uglify do
  puts "-- Compiling (UglifyJS) ..."
  Uglifier.run!
end

desc "Minify CSS with YUIcompressor"
task :cssminify do
  puts "-- Minifying CSS (YUIcompressor) ..."
  CSSminifier.run!
end

desc "Compress JS files (.gz)"
task :compress do
  puts "-- Compressing ..."
  Compressor.run!
end

desc "Clean up files"
task :clean do
  puts "-- Cleaning ..."
  files = Dir[BUILD_PATH+'/*.js'].join(" ")
  system "rm #{files}" unless files.empty?
end

desc "Build for standalone Javascript usage"
task :build => [:clean, :merge, :uglify, :cssminify]

task :default => :build
