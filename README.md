Monist is a lightweight tool for managing monorepos.

**IMPORTANT NOTE**: Monist is being phased out in favor of ``npm``
workspaces. If you were using monist for some reason you should take a look at
[``monist-tools``](https://github.com/lddubeau/monist-tools).

Monist is "lightweight" in the sense that it provides tools that your building
scripts may use, but *it does not try to replace your building scripts*. For
instance, for publishing your packages there is no master ``monist publish``
function to use. You need to write your own ``npm`` scripts, or (``gulp``
script, or what-have-you) which can make use of monist.

Motivation
==========

Most of the tools I ran into for supporting monorepos do not **adequately**
support projects that require that their source code be built into a publishable
format. **Adequately** is the operative word here. Some of them *nominally*
support it. They might suggest building into a ``lib`` directory, and setting
the ``package.json`` to include this directory and exclude source files,
etc. For *some* projects, this works. If you publish a single file, then the
``main`` field in your ``package.json`` can just point to that file under
``lib``, and you're done. So suppose you have a ``foo`` library, which you use
like this:

    import foo from "foo";

You compile your code to ``lib/foo.js`` and set a ``package.json`` that has
``main: "./lib/foo.js"``. No problem. I have some projects like this.

For *other* projects, that's a non-starter. Suppose you are publishing a complex
library that can be used like this:

    import { add, sub } from "mylib/ops";
    import { ajax, db } from "mylib/loaders";

Your library is set so that developers just load what they need from the module
they need, instead of loading the whole library monolithically. You can send all
output of the build into a ``lib`` subdirectory like you would in the
single-file scenario above. The problem though is that there is no provision in
``package.json`` to map *multiple files* to a subdirectory of a package. If you
try the same approach as in the previous scenario your users will have to import
modules like this:

    import { add, sub } from "mylib/lib/ops";
    import { ajax, db } from "mylib/lib/loaders";

The ``lib/`` subdirectory has to appear in the path. It stinks. It is an
implementation detail that developers using the library should not have to deal
with.

As we speak, to prevent the need for the extra ``lib/`` in the import paths, it
is necessary to build the publishable files into a separate directory, slap a
``package.json`` into that directory, and publish *that*.

Terminology
===========

This documentation uses a terminology that distinguishes types of x as "local x"
and "monorepo x". The basic distinction is:

* local package: a package which is a *part* of the monorepo. These packages
appear under the ``./packages/`` subdirectory. (The code of monist refers to
these as "monorepo members".)

* monorepo package (aka "top-level package"): the package modeled by a
``package.json`` appearing at the top of the monorepo. This package is never
published to an npm repository.

Then we derive other terms from this basic distinction:

* a "local `package.json`" is a `package.json` which belongs to a local package,
  whereas a "monorepo `package.json`" is the top-level one.

Requirements
============

Monist requires that your monorepo conforms to some constraints:

 * Your local packages meant for publication must be stored under
   ``./packages/``.

 * You must have a monorepo ``package.json`` file which is not meant for
   publication. You should set ``public: false`` in this file.

 * All package versions are in lockstep. If you have packages A and B in your
   monorepo, then when when A reaches version 2.3.1 then B also reaches the same
   version.

 * Publishing one package entails publishing all publishable packages, even if
   some packages did not change. (Note that monist itself does not publish
   packages so you could write a publication script that publishes only a subset
   of packages but your published packages could then refer to those packages
   you did not publish and would not be installable.)

 * When you build a local package, the publishable version of the local package
   must be put into a ``build/dist`` subdirectory under the local package's
   directory. This path is configurable in Monist's configuration file under the
   ``buildDir`` option.

 * Your ``buildDir`` directory must contain a ``./build/dist/node_modules``
   subdirectory which has the same contents as the ``node_modules`` which is in
   the local package's directory. Assuming you current working directory is the
   local package's directory, and that ``buildDir`` is the default, then this
   satisfies the requirement just given: ``(cd build/dist; ln -sf
   ../../node_modules)"``.

Usage
=====

You invoke monist with ``monist`` and then as first argument pass a monist
command. Here is a brief descriptions of the command monist offers. Please use
``monist [cmd] --help`` to get a more comprehensive description of what the
commands can do.

* ``monist npm`` runs an npm command through all packages. It orders execution
  by taking into account inter-package dependencies.

* ``monist run`` runs an npm script through all packages.  It orders execution
  by taking into account inter-package dependencies.

* ``monist update-versions`` updates version numbers in the ``package.json``
  files for all packages, including the monorepo package. Note that this command
  is **not** meant to *replace* ``npm version``. It is a command you'd use in
  your ``preversion`` script to update version numbers. This command verifies
  versions prior to running like ``monist verify-deps`` does.

* ``monist set-script`` is utility allowing you to quickly add a script to all
  local packages' ``package.json``. It does NOT touch the monorepo
  ``package.json``.

* ``monist verify-deps`` is a utility that checks whether the dependencies in
  your monorepo ``package.json`` and the local packages are in a sane state.

Configuration
=============

Monist looks for a ``monistrc.json`` file in the current working directory of
the ``monist`` process. This file may contain the following options:

``buildDir``
-----------

``buildDir: string`` (default: ``build/dist``) is the subdirectory under each
package in ``packages`` in which the installable version of the package is to be
found. For a project where the "installable version" and the source of the
package are the same thing you could set ``buildDir`` to ``"."``.

``packageOptions``
------------------

``packageOptions: object`` (default: ``{}``). This is an object under which you
may record options that determine how Monist handles the packages under the
``packages`` subdirectory. The keys of this object correspond to the **directory
names** under ``packages``. Using directory names allows us to perform some
operations *early*, prior to trying to read any ``package.json`` file. The
supported options are:

* ``ignore: boolean`` (default: ``false``) Whether to ignore this package.

Example:

```
  "packageOptions": {
    "garbage": {
      "ignore": true
    }
  }

```

This would tell Monist to ignore the content of ``packages/garbage``. Monist
would not even try to read a ``package.json`` from this directory so this file
may not even exist.

``cliOptions``
--------------

``cliOptions: object`` (default: ``{}``). This is an object under which you may
record Monist options for various operations you perform with Monist. This helps
reduce the verbosity of the scripts in ``package.json``. For instance if when
you run ``monist run build``, you need ``--serial --local-deps=link`` you can
have a ``cliOptions`` like this:

  ```
  "cliOptions": {
    "run": {
       "build": {
         "serial": true,
         "localDeps": "link"
       }
    }
  }
```

The keys under ``cliOptions`` must be either ``"run"``, for matching ``monist
run`` or ``"npm"``, for matching ``monist npm``. Then the next level under
``"run"`` or ``"npm"`` is the command name you pass to these Monist commands.
So when you do ``monist run build``. You need a ``"build"`` key under ``"run"``.

The special entry "*" under ``"run"`` and ``"nmp"`` cliOptions sets the default
for all commands under their respective headings.

The order of application of options is:

1. Monist's default values for each option.

2. The entry "*" under cliOptions.

3. The ``cliOptions`` entry that maches the command being issued.

4. The arguments passed on the command line.

At each step, the options of the step being processed overwrite the options of
already set by previous steps.

Note that the only option that are supported by cliOptions are those common to
``run`` and ``npm``:

* ``serial``
* ``localDeps``
* ``inhibitSubprocessOutput``

Usage Examples
==============

Here are examples of scripts in a monorepo ``package.json``:

```
  "scripts": {
    "build": "monist run --serial --local-deps=install build",
    "build-and-test": "monist run --serial --local-deps=install build-and-test",
    "clean": "monist run clean",
    "preversion": "monist npm version $npm_package_version",
    "postversion": "monist update-versions $npm_package_version && git add package.json package-lock.json packages/*/package.json && git commit -m'build: version bump' && git tag -a v$npm_package_version && npm run build-and-test && npm run self:publish"
  }
```

(This monorepo has a ``.nprmc`` which turns off automatic git manipulation when
issuing ``npm version``. This is why there are git commands in the
``postversion`` script.)

Running ``npm run build`` at the top level of the monorepo will build all local
packages, in an order that is such that when monist gets to some package, all
its local dependencies have been built and installed locally.

Dependency Verification Rules
=============================

Dependencies can exist both for the monorepo package and the local
packages. However, not all dependency usages make sense when using a
monorepo. ``monist verify-deps`` and ``monist update-versions`` perform the
following checks:

* The monorepo ``package.json`` may contain only ``devDependencies``. This
  package is never published. Consequently, the other types of dependencies
  supported by ``package.json`` do not make sense there.

* The ``devDependencies`` in a local ``package.json`` may only contain local
  packages. Development dependencies for everything else belong to the monorepo
  ``package.json``.

* All dependencies other than ``devDependencies`` in a local ``package.json``
  must have a corresponding entry in the monorepo ``package.json``, and the
  entry there must have the same version number as the entry in the local
  ``package.json``.

Local Dependencies
==================

When you run ``monist run`` or ``monist npm``, monist analyses the dependencies
of each package and isolates those dependencies that are to other local
dependencies. It then organizes the order in which it processes the so that when
a package is processed, its dependencies have been processed *prior* to it, and
are "installed" prior to processing the package. This is important in particular
when running a build: if package A depends on package B, you normally want
package B to have been built prior to package A.

We wrote "installed" in quotes above because you do not always want an actual
installation. There are multiple ways to simulate an installation. We describe
here what monist provides, from most preferred to least.

``--local-deps=symlink``
========================

Using this method, suppose package B depends on package P1. When monist installs
the local dependencies for package B, it will create a file
``packages/B/node_modules/@local/P1`` which is a symbolic link to
``packages/P1/build/dist``. (We assume the default ``buildDir`` setting.)

In our experience, this is the method least likely to lead to surprises.

A side-benefit of using this method is that we entirely bypass ``npm`` for the
"installation". Why does it matter? ``npm`` is extremely temperamental when it
comes to speed of execution. ``npm install`` can take 2 seconds in one run and
10 seconds the next. We're talking about installing twice in the same
package. The second run should benefit from caching... but no.

``--local-deps=install``
========================

Using this method, suppose package B depends on package P1. When monist installs
the local dependencies for package B, it will set its current working directory
to ``packages/B`` and issue ``npm install ../P1/build/dist``.

This method of doing things has some negative consequences:

1. In a chain of local dependencies, all packages except the one at the end of
   the chain will have their ``packages/*/node_modules`` populated with modules
   that duplicates those in the top-level ``node_modules``. (This is assuming
   you are following the instruction about using ``(cd build/dist; ln -sf
   ../../node_modules)"`` given above in this README.).)

2. You can end up breaking your build process. This has happened to me
   (@lddubeau) on TypeScript projects. The modifications that ``npm install``
   does to the file tree ended up preventing ``tsc`` from finding typings.

The gory details are [on this issue](https://github.com/lddubeau/monist);

``--local-deps=link``
=====================

This is the least favored method, and it is now formally deprecated. Monist 2
will remove this option.

You should use ``--local-deps=link`` **if and only if** you will not run
multiple builds of different versions of the same monorepo in a way that makes
``npm`` use the same directory for global packages. The problem with ``npm
link`` is that effectively installs the linked package globally before creating
a local link. So suppose you have a single machine in which you run a build B1
that checked out the version tag ``v1.5.3`` of your monorepo and a build B2 that
checked out the ``dev`` branch of your monorepo. And suppose two local package,
P1 and P2, with P2 dependent on P1. If both builds share the same set of global
packages, then when P2 is built, it will link to the version of P1 that was last
built, which is indeterminate because the builds are parallel.

Parallelism
===========

By default, monist reads the ``package.json`` files for all packages in
``./packages/`` and checks dependencies among these packages. When it runs
commands on all packages (e.g. when using ``monist npm`` or ``monist run``), it
runs first the commands for those packages that depend on nothing, then the
commands on those packages that depend on the packages already processed,
etc. So by the time ``monist`` gets to package X, it has run the commands on all
the packages that X depends on, directly, or transitively.

For instance, suppose the local packages A, B and C. And suppose that A depends
on B and C but B and C do not depend on any other local package. Any ``monist``
command that operates on all packages will order execution like this:

1. Run in parallel the commands for B and C.
2. Run the commands for A.

Issues With Parallelism
-----------------------

Not all commands can be issued in parallel. Examples:

* Some ``git`` commands. If you search on the internet you'll find discussions
  mentioning that it is safe to run git commands in parallel. What this means is
  that if you run two commands in parallel, you will not corrupt your
  repository. However, ``git`` may cause one of the commands issued in parallel
  to fail in order to prevent corruption. If you run ``monist run-all
  some-script`` and the script fails because a ``git`` subcommand failed, that's
  probably not the outcome you were looking for.

* Some ``npm`` commands. For instance, if you run more than one ``npm link [some
  package]`` in parallel in the packages of a monorepo, one of the commands may
  fail due to a race condition on creation of the global package that ``npm
  link`` creates.

**Monist cannot by itself detect commands that should not be run in parallel.**
If you run into issues like those above, you may need to issue use the
``--serial`` option.

<!--  LocalWords:  monorepos npm json mylib ajax monorepo cd ln cmd deps nprmc
 -->
<!--  LocalWords:  preversion postversion m'build subcommand devDependencies
 -->
<!--  LocalWords:  optionalDependencies peerDependencies bundleDependencies dev
 -->
