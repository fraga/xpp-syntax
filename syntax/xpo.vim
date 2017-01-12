if exists("b:current_syntax")
    finish
endif
syn match   xpoHeader            "Exportfile for AOT version 1.0 or later"
syn match   xppNumber            "\<\(0[0-7]*\|0[xX]\x\+\|\d\+\)[lL]\=\>"
syn match   xppNumber            "\(\<\d\+\.\d*\|\.\d\+\)\([eE][-+]\=\d\+\)\=[fFdD]\="
syn match   xppNumber            "\<\d\+[eE][-+]\=\d\+[fFdD]\=\>"
syn match   xppNumber            "\<\d\+\([eE][-+]\=\d\+\)\=[fFdD]\>"
syn keyword   xppKeywords          abstract anytype as asc at avg break breakpoint by byref case catch changeCompany class client container continue count crossCompany date default delegate delete_from desc display div do edit else eventHandler exists extends false final firstFast firstOnly firstOnly10 firstOnly100 firstOnly1000 flush for forceLiterals forceNestedLoop forcePlaceholders forceSelectOrder forUpdate from group if implements insert_recordset int int64 interface is join like maxof minof mod new next noFetch notExists null optimisticLock order outer pause pessimisticLock print private protected public real repeatableRead retry return reverse select server setting static str sum super switch tableLock this throw true try ttsAbort ttsBegin ttsCommit update_recordset validTimeState void where while window
syn region xppComment             start="/\*" end="\*/"
syn match  xppComment             "//.*$"

hi def link xppNumber Number
hi def link xpoHeader Comment
hi def link xppKeywords Keyword
hi def link xppComment Comment
