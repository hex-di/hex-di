I've been using Claude Code and Cursor daily for months now. They're incredible at generating code fast. But I keep running into the same thing.

The AI writes this:

```
catch (error: unknown) {
  console.log("something went wrong", error);
}
```

Every time. Doesn't matter which model, which tool. The happy path is great, the error handling is an afterthought. Just throw it in a catch block and move on.

And honestly? I get it. That's what most open source code looks like. That's what the training data is.

But it bit us. We had an AI-generated service call that swallowed a 403 as a generic "something went wrong." Took us a while to figure out why users were seeing blank screens.

So we started doing something different. Instead of try-catch, we return errors as typed values:

```
function fetchUser(id: string): Result<User, NotFound | Forbidden | NetworkError>
```

Now the errors are right there in the signature. When the AI generates a caller for this function, it can't just ignore the errors. The compiler won't let it. If it forgets to handle NotFound, the build breaks.

Turns out this makes AI-generated code way more reviewable too. You open a PR, you see the return type, you immediately know what can go wrong. No digging through catch blocks.

I started thinking about this as a constraint for AI, not just for humans. The stricter your types, the less room the AI has to cut corners.

We actually built a library around this idea. It's called @hex-di/result — tagged errors, compile-time contracts, the whole thing. Been using it in production and the difference in AI-generated code quality is noticeable.

result.hexdi.dev
github.com/hex-di/hex-di

Curious if anyone else is thinking about this. How do you handle the error paths in AI-generated code on your team?

#TypeScript #AI #SoftwareEngineering #CodeQuality #ErrorHandling
