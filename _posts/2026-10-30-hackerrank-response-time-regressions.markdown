---
layout: post
title: "HackerRank: Counting Response-Time Regressions"
format: log
location: "Singapore, Singapore"
tags:
  - HackerRank
---

# The question

Given an array of positive integers, return the number of elements that are strictly greater than the average of all previous elements. Skip the first element.

The HackerRank stub calls it `countResponseTimeRegressions`, so the idea is that a response time is a "regression" when it is higher than the average of everything before it.

# First attempt: brute force

My first instinct was to compute the average from scratch at every index. For each element, walk back over all the previous elements, add them up, divide, and compare.

```python
def countResponseTimeRegressions(responseTimes):
    x = 0
    y = 1
    while y < len(responseTimes):
        z = 0
        total = 0
        while z < y:
            total = total + responseTimes[z]
            z += 1
        average = total / z
        if average < responseTimes[y]:
            x += 1
        y += 1
    return x
```

This works, but the inner `while z < y` loop re-adds the same numbers over and over. The total for the previous elements only ever grows by one value each step, so recomputing it from zero is wasted work. That makes the solution `O(n^2)`.

# Optimised: carry the running total

The fix is to keep the sum as we go. Start with the first element, then each time around add the current element to the total. The average of all previous elements at index `y` is just `total / y`.

```python
#!/bin/python3

import math
import os
import random
import re
import sys


#
# Complete the 'countResponseTimeRegressions' function below.
#
# The function is expected to return an INTEGER.
# The function accepts INTEGER_ARRAY responseTimes as parameter.
#

def countResponseTimeRegressions(responseTimes):
    if len(responseTimes) <= 0:
        return 0
    x = 0
    y = 1
    total = responseTimes[0]
    while y < len(responseTimes):
        average = total / y
        if average < responseTimes[y]:
            x += 1
        total += responseTimes[y]
        y += 1
    return x


if __name__ == '__main__':
    responseTimes_count = int(input().strip())

    responseTimes = []

    for _ in range(responseTimes_count):
        responseTimes_item = int(input().strip())
        responseTimes.append(responseTimes_item)

    result = countResponseTimeRegressions(responseTimes)

    print(result)
```
{: .solution}

Only one pass over the array now, so it is `O(n)` time and `O(1)` extra space. The `len(responseTimes) <= 0` guard is not strictly needed either: if the array is empty the loop never runs and the function already returns `0`.

# Why I did not do this first

This was actually why I reached for the brute force version in the first place. I could see that carrying a running total would remove the inner loop, but I got stuck on how to start it. The loop begins at index `1`, so `total` has to already contain the first element before the loop even runs. I kept trying to add it inside the loop and getting the average wrong, so I gave up and recomputed the sum each time instead.

The unlock was simply defining `total = responseTimes[0]` before the loop. Then at `y = 1` the average is `total / 1`, which is just the first element, exactly what the question wants. The rest of the loop adds each new element after using it.

Looking back, the hard part of the optimisation was not the loop, it was the initial state. Once `total` started at the right value, everything else fell out.

# What I learned

- When a loop keeps recomputing the same aggregate, try carrying it forward instead. A running sum turned `O(n^2)` into `O(n)`.
- The average of the previous elements at index `i` is `total / i`. No need to track a separate count.
- Re-read the question carefully: "skip the first element" and "strictly greater" both matter. Using `<=` instead of `<` would count ties by mistake.
- Before optimising, make sure the simple version is actually correct. The brute force version was a good check for the faster one.
- The tricky part of a running aggregate is often the initial state, not the loop itself. Get `total` seeded correctly and the rest is easy.

To flag a code block as the version I submitted in future logs, I just add `{: .solution}` on the line after the closing fence, like the optimised block above.
