#!/usr/bin/env bash
SCRIPT_DIR=$(cd $(dirname "${BASH_SOURCE[0]}") && pwd)
SRC_DIR=$(dirname "${SCRIPT_DIR}")/src
GLOBBIES=(${@});

for path in $(find $SRC_DIR -type d); do
  path=$(echo $path | sed 's/\/*$//g')
  echo "Looking for globbies in $path"
  for globbie in "${GLOBBIES[@]}"; do

    # A globbie directory exists on this path.
    # If it has an index file, lets see if we need to update it.
    if [ -d "$path/$globbie" ];
    then
      echo "Globby here. I'm going in. ($path + $globbie)"
      cd "$path/$globbie";

      # Operate on each file.
      for f in *
      do
        echo "Appraising ............ $f"
        # Skip the index.ts file when looping.
        if [ ! $f == "index.ts" ]
        then
          trimmed=$(echo $f | sed 's/.ts*$//g')
          echo $trimmed

          # Index file exists, but has a size of 0.
          # Probably safe to add a globbie file.
          if [ -f "./index.ts" ] && [ ! -s "./index.ts" ];
          then
            echo "Index file exists, but has a size of 0."
            echo "$trimmed wasn't in the empty index, of course. Adding it."
            # Using > since this is the first entry.
            echo "export * from './$trimmed'" > "./index.ts"
          # Index's size isn't 0.
          elif [ -f "index.ts" ] && [ -s "index.ts" ]
          then
            # Check the index contents for the current globbie file.
            # This globbie file is already there. Skip it.
            # checkresult=`cat "index.ts" | grep '${trimmed}'`
            # `grep -is "${trimmed}" $(pwd)/index.ts`;
            # if [ `grep -q ${trimmed} "$(pwd)/index.ts"` ]; then
            # if [ $? = 0 ]; then
            echo "Index exists, and its size is greater than 0"

            # $(grep -q $trimmed index.ts && echo 'already there.') || echo "adding $f" && echo "export * from './$trimmed'" >> $(pwd)'/index.ts';
            # (cat index.ts | grep -i $trimmed && echo "$trimmed is already there. Skipping.") ||

            # ($(grep "$trimmed" "./index.ts") && echo "$trimmed is already there. Skipping.") ||
            # (echo "$trimmed not found in the index. Adding it!"
              # $(echo "export * from './$trimmed'" >> index.ts))
            echo "This is where we are by the way: $(pwd)"

            if grep -Fx "export * from './$trimmed'" "./index.ts";
            then
              echo "This one's already in the index."
            else
            echo "Didn't see this file, adding it."

            # [ $? -ne 0 ] && echo "Didn't see this file, adding it."
            echo "export * from './$trimmed'" >> "index.ts"
            fi

            # if $(cat 'index.ts' | grep -q $trimmed);
            # then
            #   echo "$trimmed is already there. Skip it."
            # else
            #   echo $trimmed not found in the index. Adding it.
            #   echo "export * from './$trimmed'" >> "index.ts"
            # fi
          fi
        else
          echo "This one is the index, moving on...";
        fi
      done
    fi
  done
done
