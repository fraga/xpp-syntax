if exists("b:current_syntax")
    finish
endif

hi Label guifg=white guibg=magenta
hi xppComment guifg=white guibg=DarkGreen

syn match   xpoHeader            "Exportfile for AOT version 1.0 or later"
syn match   xppNumber            "\<\(0[0-7]*\|0[xX]\x\+\|\d\+\)[lL]\=\>"
syn match   xppNumber            "\(\<\d\+\.\d*\|\.\d\+\)\([eE][-+]\=\d\+\)\=[fFdD]\="
syn match   xppNumber            "\<\d\+[eE][-+]\=\d\+[fFdD]\=\>"
syn match   xppNumber            "\<\d\+\([eE][-+]\=\d\+\)\=[fFdD]\>"
syn match   xppNumber            "\v\x{8}-(\x{4}-){3}\x{12}"
syn region  xppString             start=+"+  end=+"+ end=+$+
syn region  xppString             start=+'+  end=+'+ end=+$+
syn keyword   xppKeywords          abstract anytype as asc at avg break breakpoint by byref case catch changeCompany class client container continue count crossCompany date default delegate delete_from desc display div do edit else eventHandler exists extends false final firstFast firstOnly firstOnly10 firstOnly100 firstOnly1000 flush for forceLiterals forceNestedLoop forcePlaceholders forceSelectOrder forUpdate from group if implements insert_recordset int int64 interface is join like maxof minof mod new next noFetch notExists null optimisticLock order outer pause pessimisticLock print private protected public real repeatableRead retry return reverse select server setting static str sum super switch tableLock throw true try ttsAbort ttsBegin ttsCommit update_recordset validTimeState void where while window
syn region xppComment             start="/\*" end="\*/"
syn match  xppComment             "//.*$"
syn keyword xppType               boolean
syn match xppLabel                "@[A-Z]\{3}[0-9]\{1,10}"
syn region xppLabel               start=+@[A-Z]\{3}+ end=+[0-9]\{1,10}+

hi def link xppNumber Number
hi def link xpoHeader Comment
hi def link xppKeywords Keyword
hi def link xppComment xppComment
hi def link xppType Type
hi def link xppString String
hi def link xppLabel Label
