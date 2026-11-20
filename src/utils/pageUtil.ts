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

/**
 * 文档工具类
 */
class PageUtil {
  public static getPageId() {
    const getTitlePageId = (title: Element | null | undefined) => title?.getAttribute("data-node-id") ?? ""

    // 活动窗口的焦点页签才是当前文档；分屏里另一个编辑器即使可见也不能当作当前文档
    const activeTabId = document
      .querySelector(".layout__wnd--active .layout-tab-bar .item--focus[data-id]")
      ?.getAttribute("data-id")
    if (activeTabId) {
      const activeEditor = Array.from(document.querySelectorAll("div.protyle[data-id]")).find(
        (editor) => editor.getAttribute("data-id") === activeTabId
      )
      const activeTitle = activeEditor?.querySelector("div.protyle-title[data-node-id]")
      if (activeTitle) {
        return getTitlePageId(activeTitle)
      }
    }

    // 回退：直接找文档标题节点，跳过隐藏页签里的标题；不依赖 protyle-lite-fragment 类名
    const titles = Array.from(document.querySelectorAll("div.protyle-title[data-node-id]"))
    return getTitlePageId(titles.find((title) => title.closest(".fn__none") === null))
  }
}

export default PageUtil
