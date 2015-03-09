# This script ensures that all dependencies (NPM and Bower) are checked against a whitelist of commits.
# Only non-minified source if checked, so always make sure to minify dependencies yourself. Development 
# tools - and perhaps some very large common libraties - are skipped in these checks.

# npm-shrinkwrap.json should be present (e.g. generated with Grunt or 
# "npm shrinkwrap"). This contains the list of all (sub) dependencies.

# Ruby is needed as well as the following gems:
# gem install json

# Github API requires authentication because of rate limiting. So run with:
# GITHUB_USER=username GITHUB_PASSWORD=password ruby check-dependencies.rb

require 'json'
require 'open-uri'

http_options = {:http_basic_authentication=>[ENV['GITHUB_USER'], ENV['GITHUB_PASSWORD']]}

package = JSON.parse(File.read('package.json'))

shrinkwrap = JSON.parse(File.read('npm-shrinkwrap.json'))
deps = shrinkwrap["dependencies"]

whitelist = JSON.parse(File.read('dependency-whitelist.json'))

output = package.dup
output["dependencies"] = {}
output["devDependencies"] = {}
output.delete("author")
output.delete("contributors")
output.delete("homepage")
output.delete("bugs")
output.delete("license")
output.delete("repository")
output["scripts"].delete("test")
output["scripts"]["postinstall"] = "browserify -s Browserify ../browserify-imports.js > browserify.js && cd node_modules/bip39 && npm run compile && mv bip39.js ../.. && cd ../.. && cp node_modules/xregexp/xregexp-all.js . && cd node_modules/sjcl && ./configure --with-sha1 && make && cd - && cp node_modules/sjcl/sjcl.js ."

deps.keys.each do |key|
  if whitelist["ignore"].include? key
    # output["dependencies"][key] = deps[key]
    next
  end
    
  dep = deps[key]
  if whitelist[key]
    if dep['version'] > whitelist[key]['version']
      abort "#{ key } version #{ dep['version'] } has not been whitelisted yet. Most recent: #{ whitelist[key]['version'] }"     
      # TODO: generate URL showing all commits since the last whitelisted one
      # TODO: allow fallback to older version if range permits
      next
    end
    
    # TODO: get pointer to Github on NPM: https://www.npmjs.com/package/bigi
    url = "https://api.github.com/repos/#{ whitelist[key]["repo"] }/tags"
    # puts url
    tags = JSON.load(open(url, http_options))
    
    tag = nil
    
    tags.each do |candidate|
      if candidate["name"] == "v#{ dep['version'] }" || candidate["name"] == dep['version']
        tag = candidate
        break
      end
    end
    
    if !tag.nil?
      # Check if tagged commit matches whitelist commit (this or earlier version)
      if whitelist[key]["commits"].include?(tag["commit"]["sha"])
        output["dependencies"][key] = "#{ whitelist[key]["repo"] }##{ tag["commit"]["sha"] }"
        
      else
        abort "Error: v#{ dep['version'] } of #{ key } does not match the whitelist."
        next
      end
      
      
    else
      puts "Warn: no Github tag found for v#{ dep['version'] } of #{ key }."
      # Look through the list of commits instead:
      url = "https://api.github.com/repos/#{ whitelist[key]["repo"] }/commits"
      # puts url
      commits = JSON.load(open(url, http_options))
      commit = nil
      
      commits.each do |candidate|
        if candidate["sha"] == whitelist[key]['commits'].first
          commit = candidate
          
          break
        end
      end
      
      if !commit.nil?
        output["dependencies"][key] = "#{ whitelist[key]["repo"] }##{ commit["sha"] }"
      else
        puts "Error: no Github commit #{ whitelist[key]["commits"].first } of #{ key }."
        next
      end
      
    end

  else
    abort "#{key} not whitelisted!"  
  end
end

File.write("build/package.json", JSON.pretty_generate(output))

# TODO: shrinkwrap each subdependency and/or disallow packages to install dependencies themselves?
# TODO: check bower dependencies