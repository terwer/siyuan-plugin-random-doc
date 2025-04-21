/*
 * Copyright (c) 2023, Terwer . All rights reserved.
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  Terwer designates this
 * particular file as subject to the "Classpath" exception as provided
 * by Terwer in the LICENSE file that accompanied this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the LICENSE file that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * Please contact Terwer, Shenzhen, Guangdong, China, youweics@163.com
 * or visit www.terwer.space if you need additional information or have any
 * questions.
 */

import { HtmlUtil, StrUtil } from "zhi-common"

/**
 * 清理字符串中的零宽字符和其他不可见字符
 * @param {string} str 原始字符串
 * @returns {string} 清理后的字符串
 */
const cleanInvisibleChars = (str) => {
  if (typeof str !== "string") return ""
  return str
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "") // 零宽字符、不换行空格
    .trim()
}

/**
 * 严格判断字符串是否为空（清理后）
 * @param {string} str 原始字符串
 * @returns {boolean}
 */
export const isContentEmpty = (str: string): boolean => {
  const plainContent = HtmlUtil.filterHtml(str)
  const cleanedStr = cleanInvisibleChars(plainContent)
  return StrUtil.isEmptyString(cleanedStr)
}
