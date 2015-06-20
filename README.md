# A frontend workflow with Gulp

__Dev__ task (default) including: 

+ styles (sass, autoprefixer and pixrem with sourcemaps)
+ scripts (concat and uglify with sourcemaps)
+ images (optimization)
+ watch
+ livereload

```
$ gulp
```

__Build__ process including:

+ styles (no sourcemaps)
+ scripts (no sourcemaps)
+ images (optimization)
+ copy (copy modified files and remove deleted files)
+ revision (for main stylesheet/scripts and images files)

```
$ gulp build
```

## To-do list

+ Add HTML minifcation

-----

## Contributing

Feel free to comment or open an issue/PR.
